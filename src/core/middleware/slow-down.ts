import expressSlowDown from 'express-slow-down';

/**
 * Creates an instance of `express-slow-down` with Redis to be used globally.
 *
 * @param delayAfter - Number of requests before being throttled.
 * @returns Instance of `express-slow-down`.
 */
const slowDown = (delayAfter: number) => {
  return expressSlowDown({
    delayAfter, // start to delay by 'delayMs' after 'delayAfter' requests has been made in 'windowMs'
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayMs: 200,
  });
};

export default slowDown;
