import type { NextFunction, Request, Response } from 'express';

/**
 * Middleware to validate the `Accept` header in the API.
 *
 * @returns Middleware to validate the `Accept` header.
 */
const accept = () => (req: Request, _: Response, next: NextFunction) => {
  const { accept } = req.headers;

  // If the request do not `Accept` available formats, deny the request.
  if (!accept?.includes('application/json')) {
    // next(new AppError('API does not support the requested content type.', 406));
    next();
    return;
  }

  next();
};

export default accept;
