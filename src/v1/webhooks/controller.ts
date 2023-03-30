import type { Request, Response } from 'express';

/**
 * Handle all requests from 'WebhookHandler'.
 */
class WebhookControllerHandler {
  /**
   * Gets all Webhooks related to a single user.
   *
   * @param req - Express.js's request object.
   * @param res - Express.js's response object.
   */
  public apifyWebhook = async (req: Request, res: Response) => {
    console.log(JSON.stringify(req.body));
    console.log(JSON.stringify(req.query));
    console.log(JSON.stringify(req.headers));

    return res.status(200).send();
  };
}

export const WebhookController = new WebhookControllerHandler();
