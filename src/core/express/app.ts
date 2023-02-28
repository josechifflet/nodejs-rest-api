import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';

import config from '../../config';
import AttendanceRouter from '../../v1/attendance/router';
import AuthRouter from '../../v1/auth-master/router';
import AuthProfileRouter from '../../v1/auth-profile/router';
import UserRouter from '../../v1/masteruser/router';
import ProfileRouter from '../../v1/profile/router';
import errorHandler from '../errorHandler';
import accept from '../middleware/accept';
import busyHandler from '../middleware/busy-handler';
import { errorLogger, successLogger } from '../middleware/logger';
import notFound from '../middleware/not-found';
import slowDown from '../middleware/slow-down';
import xPoweredBy from '../middleware/x-powered-by';
import xRequestedWith from '../middleware/x-requested-with';
import xst from '../middleware/xst';

// Create Express application.
const app = express();

// Allow proxies on our nginx server in production.
if (config.NODE_ENV === 'production') app.enable('trust proxy');

// Use logging on application.
if (config.NODE_ENV === 'production')
  app.use(
    morgan(
      ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms'
    )
  );
else app.use(morgan('dev'));

// Security headers.
app.use(helmet({ frameguard: { action: 'deny' }, hidePoweredBy: false }));

app.use('/api/health', (_, res) => res.status(200).send());

// Enable special `X-Powered-By` header.
app.use(xPoweredBy());

// Check for CSRF via the Header method.
app.use(xRequestedWith());

// Validate `Accept` header.
app.use(accept());

// Handle if server is too busy.
app.use(busyHandler());

// Prevent parameter pollution.
app.use(hpp());

// Only allow the following methods: [OPTIONS, HEAD, CONNECT, GET, POST, PATCH, PUT, DELETE].
app.use(xst());

// Define handlers.
const attendanceRouter = AttendanceRouter();
const authRouter = AuthRouter();
const authProfileRouter = AuthProfileRouter();
const userRouter = UserRouter();
const profileRouter = ProfileRouter();

// Log requests (successful requests).
app.use(successLogger);

// Define API routes. Throttle '/api' route to prevent spammers.
app.use('/api', slowDown(75));
app.use('/api/v1/auth-master', authRouter);
app.use('/api/v1/auth-profile', authProfileRouter);
app.use('/api/v1/attendances', attendanceRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/profiles', profileRouter);

// Catch-all routes for API.
app.all('*', notFound());

// Log errors.
app.use(errorLogger);

// Define error handlers.
app.use(errorHandler);

export default app;
