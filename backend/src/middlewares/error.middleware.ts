import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http-error';

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Request validation failed',
      details: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (isRecord(error) && typeof error.code === 'string') {
    const statusByCode: Record<string, number> = {
      '22P02': 400,
      '22001': 400,
      '23502': 400,
      '23503': 400,
      '23505': 409,
      '23514': 400,
      '42501': 403,
      P0002: 404,
      PGRST116: 404,
    };
    const status = statusByCode[error.code];
    if (status) {
      res.status(status).json({
        error: typeof error.message === 'string' ? error.message : 'Database request failed',
      });
      return;
    }
  }

  if (isRecord(error) && error.type === 'entity.too.large') {
    res.status(413).json({ error: 'Request body exceeds the 7 MB limit' });
    return;
  }
  if (isRecord(error) && error.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'Request body must be valid JSON' });
    return;
  }

  console.error('Unhandled API error', error);
  res.status(500).json({ error: 'Internal server error' });
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
