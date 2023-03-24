import { expressMiddleware } from '@apollo/server/express4';
import { json } from 'body-parser';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';

import config from '../../config';
import AttendanceRouter from '../../v1/attendance/router';
import AuthRouter from '../../v1/auth/router';
import HealthRouter from '../../v1/health/router';
import SessionRouter from '../../v1/session/routes';
import UserRouter from '../../v1/user/router';
import { intializeApolloServer } from '../apollo/server';
import errorHandler from '../errorHandler';
import accept from '../middleware/accept';
import busyHandler from '../middleware/busy-handler';
import { errorLogger, successLogger } from '../middleware/logger';
import notFound from '../middleware/not-found';
import session from '../middleware/session';
import slowDown from '../middleware/slow-down';
import xPoweredBy from '../middleware/x-powered-by';
import xRequestedWith from '../middleware/x-requested-with';
import xst from '../middleware/xst';
import { startServer } from './start-server';

/**
 * Creates an Express application.
 */
class App {
  private app: express.Application | undefined;

  public constructAsync = async () => {
    // Create Express application.
    this.app = express();

    const apolloServer = await intializeApolloServer(this.app);
    this.app.use('/graphql', json(), expressMiddleware(apolloServer));

    // Allow proxies on our nginx server in production.
    if (config.NODE_ENV === 'production') this.app.enable('trust proxy');

    // Use logging on application.
    if (config.NODE_ENV === 'production')
      this.app.use(
        morgan(
          ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms'
        )
      );
    else this.app.use(morgan('dev'));

    // Security headers.
    this.app.use(
      helmet({ frameguard: { action: 'deny' }, hidePoweredBy: false })
    );

    // Enable special `X-Powered-By` header.
    this.app.use(xPoweredBy());

    // Check for CSRF via the Header method.
    this.app.use(xRequestedWith());

    // Validate `Accept` header.
    this.app.use(accept());

    // Handle if server is too busy.
    this.app.use(busyHandler());

    // Load signed cookie parser. JSON parser is loaded in each required
    // endpoints in a case-by-case basis.
    this.app.use(cookieParser(config.COOKIE_SECRET));

    // Prevent parameter pollution.
    this.app.use(hpp());

    // Only allow the following methods: [OPTIONS, HEAD, CONNECT, GET, POST, PATCH, PUT, DELETE].
    this.app.use(xst());

    // Prepare to use Express Sessions.
    this.app.use(session());

    // Define handlers.
    const attendanceRouter = AttendanceRouter();
    const authRouter = AuthRouter();
    const healthRouter = HealthRouter();
    const sessionRouter = SessionRouter();
    const userRouter = UserRouter();

    // Log requests (successful requests).
    this.app.use(successLogger);

    // Define API routes. Throttle '/api' route to prevent spammers.
    this.app.use('/api', slowDown(75));
    this.app.use('/api/v1', healthRouter);
    this.app.use('/api/v1/auth', authRouter);
    this.app.use('/api/v1/attendances', attendanceRouter);
    this.app.use('/api/v1/sessions', sessionRouter);
    this.app.use('/api/v1/users', userRouter);

    // Catch-all routes for API.
    this.app.all('*', notFound());

    // Log errors.
    this.app.use(errorLogger);

    // Define error handlers.
    this.app.use(errorHandler);
  };

  public start = async () => {
    if (this.app) startServer(this.app);
  };
}

export default new App();
