import { Server as IOServer } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { jwt, qrToken } from '../lib/jwt';
import { logger } from '../lib/logger';
import { env } from '../config/env';
import { bindIo } from './emit';
import { roomKey, ClientEvents } from '@qrder/shared';

export function createSocketServer(httpServer: HttpServer): IOServer {
  const io = new IOServer(httpServer, {
    cors: {
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  bindIo(io);

  io.use(async (socket, next) => {
    try {
      const auth = socket.handshake.auth as
        | { token?: string; qrToken?: string }
        | undefined;

      if (auth?.token) {
        const claims = await jwt.verifyAccess(auth.token);
        socket.data.user = {
          id: claims.sub,
          tenantId: claims.tenantId,
          branchId: claims.branchId,
          role: claims.role,
          perms: claims.perms,
          kind: 'operator' as const,
        };
        return next();
      }

      if (auth?.qrToken) {
        const claims = await qrToken.verify(auth.qrToken);
        socket.data.user = {
          tenantId: claims.tenantId,
          branchId: claims.branchId,
          tableId: claims.tableId,
          kind: 'customer' as const,
        };
        return next();
      }

      next(new Error('No auth token'));
    } catch (err) {
      logger.warn({ err: (err as Error).message }, 'socket auth failed');
      next(new Error('Auth failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as
      | {
          kind: 'operator';
          tenantId: string;
          branchId: string | null;
        }
      | { kind: 'customer'; tenantId: string; branchId: string; tableId: string }
      | undefined;
    if (!user) return socket.disconnect(true);

    logger.debug({ socketId: socket.id, kind: user.kind }, 'socket connected');

    if (user.kind === 'operator' && user.branchId) {
      socket.join(roomKey.branchOrders(user.tenantId, user.branchId));
      socket.join(roomKey.branchKitchen(user.tenantId, user.branchId));
      socket.join(roomKey.branchTables(user.tenantId, user.branchId));
    }

    socket.on(ClientEvents.JoinOrderRoom, (orderId: string) => {
      if (typeof orderId !== 'string') return;
      socket.join(roomKey.order(user.tenantId, orderId));
    });

    socket.on(ClientEvents.LeaveOrderRoom, (orderId: string) => {
      if (typeof orderId !== 'string') return;
      socket.leave(roomKey.order(user.tenantId, orderId));
    });

    socket.on(ClientEvents.Ping, (ack: unknown) => {
      if (typeof ack === 'function') (ack as (data: unknown) => void)({ pong: true, at: Date.now() });
    });

    socket.on('disconnect', (reason) => {
      logger.debug({ socketId: socket.id, reason }, 'socket disconnected');
    });
  });

  return io;
}
