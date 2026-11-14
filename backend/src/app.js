import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import env from './config/env.js';
import apiRouter from './routes/index.js';
import healthController from './controllers/healthController.js';
import sitemapController from './controllers/sitemapController.js';
import renderController from './controllers/renderController.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestIdMiddleware, noSqlSanitizerMiddleware } from './middleware/security.js';

const app = express();

// Security HTTP headers with Content Security Policy & frame protection
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', 'https://images.unsplash.com'],
        connectSrc: ["'self'", '*'],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Unique Request ID generation & propagation
app.use(requestIdMiddleware);

// CORS configuration supporting single domain, wildcard, or comma-separated list
const allowedOrigins =
  env.corsOrigin === '*'
    ? '*'
    : env.corsOrigin.split(',').map((origin) => origin.trim().replace(/\/$/, ''));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins === '*' || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      const cleanOrigin = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked request from origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token', 'x-request-id'],
    exposedHeaders: ['x-request-id'],
  })
);

// Cookie parser for secure HttpOnly session tokens
app.use(cookieParser());

// Request body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// NoSQL operator injection sanitizer
app.use(noSqlSanitizerMiddleware);

// Static uploads serving (for local media storage fallback)
app.use('/uploads', express.static(env.storage.uploadDir));

// HTTP logging
if (env.nodeEnv !== 'test') {
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));
}

// Health check endpoint (for load balancers, Render, Docker, etc.)
app.get('/health', healthController.getHealth);

// Dynamic XML Sitemap for search engines
app.get('/sitemap.xml', sitemapController.getSitemap);

// SEO Crawler Prerender Endpoint for blog articles
app.get('/render/blog/:slug', renderController.renderBlogPage);

// Also serve SEO prerender on direct /blog/:slug if User-Agent is a search crawler or social bot
app.get('/blog/:slug', (req, res, next) => {
  const ua = req.headers['user-agent'] || '';
  if (renderController.isCrawler(ua)) {
    return renderController.renderBlogPage(req, res, next);
  }
  return next();
});

// Mount API v1 router
app.use('/api/v1', apiRouter);

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Central error handler
app.use(errorHandler);

export default app;
