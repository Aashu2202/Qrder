import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';

import { env } from './config/env';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/auth.routes';
import { healthRouter } from './modules/health/health.routes';
import { menuRouter } from './modules/menu/menu.routes';
import { tablesRouter } from './modules/tables/tables.routes';
import { branchesRouter } from './modules/branches/branches.routes';
import { qrRouter } from './modules/qr/qr.routes';
import { ordersRouter } from './modules/orders/orders.routes';
import { kitchenRouter } from './modules/kitchen/kitchen.routes';
import { couponsRouter } from './modules/coupons/coupons.routes';
import { paymentsRouter, paymentsWebhookRouter } from './modules/payments/payments.routes';
import { uploadsRouter } from './modules/uploads/uploads.routes';
import { staffRouter } from './modules/staff/staff.routes';
import { auditRouter } from './modules/audit/audit.routes';
import { analyticsRouter } from './modules/analytics/analytics.routes';
import { customersRouter } from './modules/customers/customers.routes';
import { feedbackRouter } from './modules/feedback/feedback.routes';
import { inventoryRouter } from './modules/inventory/inventory.routes';
import { pricingRouter } from './modules/pricing/pricing.routes';
import { serviceRequestsRouter } from './modules/service-requests/service-requests.routes';

const JSON_LIMIT = '10mb';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: env.ALLOWED_ORIGINS,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(cookieParser());

  // IMPORTANT: webhooks must read raw bytes — mount BEFORE the JSON parser.
  app.use('/v1/payments/webhook', paymentsWebhookRouter);

  app.use(express.json({ limit: JSON_LIMIT }));
  app.use(express.urlencoded({ extended: false }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

  // Public health
  app.use('/health', healthRouter);

  // Public customer routes — QR-token-scoped, no JWT
  app.use('/q/:token', qrRouter);

  // Operator (JWT-protected) routes
  app.use('/v1/auth', authRouter);
  app.use('/v1/menu', menuRouter);
  app.use('/v1/branches', branchesRouter);
  app.use('/v1/tables', tablesRouter);
  app.use('/v1/orders', ordersRouter);
  app.use('/v1/kitchen', kitchenRouter);
  app.use('/v1/coupons', couponsRouter);
  app.use('/v1/payments', paymentsRouter);
  app.use('/v1/uploads', uploadsRouter);
  app.use('/v1/staff', staffRouter);
  app.use('/v1/audit-logs', auditRouter);
  app.use('/v1/analytics', analyticsRouter);
  app.use('/v1/customers', customersRouter);
  app.use('/v1/feedback', feedbackRouter);
  app.use('/v1/inventory', inventoryRouter);
  app.use('/v1/pricing-rules', pricingRouter);
  app.use('/v1/service-requests', serviceRequestsRouter);

  app.use((_req, res) => {
    res.status(404).type('application/problem+json').json({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
    });
  });

  app.use(errorHandler);

  return app;
}
