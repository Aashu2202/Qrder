import type { Server as IOServer } from 'socket.io';
import {
  ServerEvents,
  roomKey,
  type ServerEventPayloads,
} from '@qrder/shared';

let io: IOServer | null = null;

export function bindIo(server: IOServer) {
  io = server;
}

function publish<E extends keyof ServerEventPayloads>(
  rooms: string[],
  event: E,
  payload: ServerEventPayloads[E],
) {
  if (!io) return;
  io.to(rooms).emit(event, payload);
}

export const emit = {
  orderPlaced(tenantId: string, branchId: string, payload: ServerEventPayloads[typeof ServerEvents.OrderPlaced]) {
    publish(
      [roomKey.branchOrders(tenantId, branchId), roomKey.branchKitchen(tenantId, branchId)],
      ServerEvents.OrderPlaced,
      payload,
    );
  },
  orderStatusChanged(
    tenantId: string,
    branchId: string,
    orderId: string,
    payload: ServerEventPayloads[typeof ServerEvents.OrderStatusChanged],
  ) {
    publish(
      [
        roomKey.branchOrders(tenantId, branchId),
        roomKey.branchKitchen(tenantId, branchId),
        roomKey.order(tenantId, orderId),
      ],
      ServerEvents.OrderStatusChanged,
      payload,
    );
  },
  orderItemStatusChanged(
    tenantId: string,
    branchId: string,
    orderId: string,
    payload: ServerEventPayloads[typeof ServerEvents.OrderItemStatusChanged],
  ) {
    publish(
      [roomKey.branchKitchen(tenantId, branchId), roomKey.order(tenantId, orderId)],
      ServerEvents.OrderItemStatusChanged,
      payload,
    );
  },
  tableStatusChanged(
    tenantId: string,
    branchId: string,
    payload: ServerEventPayloads[typeof ServerEvents.TableStatusChanged],
  ) {
    publish([roomKey.branchTables(tenantId, branchId)], ServerEvents.TableStatusChanged, payload);
  },
  tableWaiterCalled(
    tenantId: string,
    branchId: string,
    payload: ServerEventPayloads[typeof ServerEvents.TableWaiterCalled],
  ) {
    publish(
      [roomKey.branchOrders(tenantId, branchId), roomKey.branchTables(tenantId, branchId)],
      ServerEvents.TableWaiterCalled,
      payload,
    );
  },
};
