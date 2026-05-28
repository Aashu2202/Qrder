import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).type('application/problem+json').json({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: 'Validation failed',
      fields: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).type('application/problem+json').json({
      type: err.type,
      title: err.title,
      status: err.status,
      detail: err.detail,
      fields: err.fields,
    });
    return;
  }

  logger.error({ err, url: req.url, method: req.method }, 'unhandled error');
  res.status(500).type('application/problem+json').json({
    type: 'about:blank',
    title: 'Internal Server Error',
    status: 500,
    detail: 'Something went wrong',
  });
};
