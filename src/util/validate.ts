import { NextFunction, Request, Response } from 'express';
import { AnyZodObject } from 'zod';

/**
 * Allows to perform a customized validation with zod.
 * @param schema - Zod schema.
 * @returns Express Validation function callback.
 */
const validate =
  (schema: AnyZodObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      req.body = parsed.body;
      req.query = parsed.query;
      req.params = parsed.params;

      return next();
    } catch (error) {
      return res.status(422).json(error);
    }
  };

export default validate;
