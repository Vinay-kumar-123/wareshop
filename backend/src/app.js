import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import env from './config/env.js';
import apiRouter from './routes/index.js';
import healthController from './controllers/healthController.js';
import sitemapController from './controllers/sitemapController.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestIdMiddleware, noSqlSanitizerMiddleware } from './middleware/security.js';

const app = express();

// Proxy-aware client IP resolution for Render / reverse proxies (SEC-02)
app.set('trust proxy', env.trustProxy);

// Security HTTP headers with Content Security Policy & frame protection
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', 'https://images.unsplash.com'],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Unique Request ID generation & propagation
app.use(requestIdMiddleware);

// CORS configuration supporting single domain or comma-separated allow-list (never wildcard in prod)
const allowedOrigins =
  !env.isProduction && env.corsOrigin === '*'
    ? '*'
    : env.corsOrigin
        .split(',')
        .map((origin) => origin.trim().replace(/\/$/, ''))
        .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, server-to-server, Supertest)
      if (!origin) {
        return callback(null, true);
      }
      if (!env.isProduction && (allowedOrigins === '*' || allowedOrigins.includes('*'))) {
        return callback(null, true);
      }
      const cleanOrigin = origin.replace(/\/$/, '');
      if (Array.isArray(allowedOrigins) && allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }
      const corsErr = new Error('CORS blocked request from untrusted origin');
      corsErr.code = 'ERR_CORS_BLOCKED';
      corsErr.statusCode = 403;
      return callback(corsErr);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'x-request-id',
      'x-konnevia-test-suite',
      'x-wareshop-test-suite',
    ],
    exposedHeaders: ['x-request-id'],
  })
);

// Cookie parser (for HttpOnly provider session cookie) and JSON body parser
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// NoSQL operator injection sanitizer
app.use(noSqlSanitizerMiddleware);

// Static uploads serving (for local media storage in dev/test)
app.use('/uploads', express.static(env.storage.uploadDir));

// HTTP logging
if (env.nodeEnv !== 'test') {
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));
}

// Health check endpoints (for load balancers, Render, orchestrators)
app.get('/health', healthController.getHealth);
app.get('/health/live', healthController.getLiveness);
app.get('/health/ready', healthController.getReadiness);

// Dynamic XML Sitemap for search engines
app.get('/sitemap.xml', sitemapController.getSitemap);

// Mount API v1 router
app.use('/api/v1', apiRouter);

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Central error handler
app.use(errorHandler);

export default app;
