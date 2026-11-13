import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import universitiesRoutes from './modules/universities/universities.routes';
import hallsRoutes from './modules/halls/halls.routes';
import settingsRoutes from './modules/settings/settings.routes';

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get('/healthz', (_req, res) => {
    res.json({ ok: true, service: 'freehall-server', ts: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/universities', universitiesRoutes);
  app.use('/api/halls', hallsRoutes);
  app.use('/api/settings', settingsRoutes);

  app.use(errorHandler);
  return app;
}