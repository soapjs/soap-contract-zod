import type { Request, Response, NextFunction } from 'express';
import type { ValidatorFn } from './zod-adapter';

/** Validate `req.body` (Express middleware). */
export function createBodyValidationMiddleware(validator: ValidatorFn) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await validator(req.body);
      if (!result.valid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: result.errors ?? [],
        });
      }
      if (result.value !== undefined) {
        req.body = result.value;
      }
      next();
    } catch {
      res.status(500).json({ error: 'Validation error' });
    }
  };
}

/** Validate `req.query`. */
export function createQueryValidationMiddleware(validator: ValidatorFn) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await validator(req.query);
      if (!result.valid) {
        return res.status(400).json({
          error: 'Query validation failed',
          details: result.errors ?? [],
        });
      }
      if (result.value !== undefined) {
        req.query = result.value as Request['query'];
      }
      next();
    } catch {
      res.status(500).json({ error: 'Query validation error' });
    }
  };
}

/** Validate `req.params`. */
export function createParamsValidationMiddleware(validator: ValidatorFn) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await validator(req.params);
      if (!result.valid) {
        return res.status(400).json({
          error: 'Parameter validation failed',
          details: result.errors ?? [],
        });
      }
      if (result.value !== undefined) {
        req.params = result.value as Request['params'];
      }
      next();
    } catch {
      res.status(500).json({ error: 'Parameter validation error' });
    }
  };
}
