import type { Request, Response } from 'express';
import { Router } from 'express';

import sendResponse from '../../util/send-response';

/**
 * Handler to check the health of the service.
 *
 * @returns Express router.
 */
const HealthRouter = () => {
  const router = Router();

  /**
   * Checks the health of the service.
   */
  router.get('/', (req: Request, res: Response) => {
    sendResponse({
      req,
      res,
      status: 'success',
      statusCode: 200,
      data: [],
      message: 'Healthy',
      type: 'general',
    });
  });

  return router;
};

export default HealthRouter;
