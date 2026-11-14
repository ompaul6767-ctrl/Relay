import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import authRoutes from './routes/authRoutes.js';
import caseRoutes from './routes/caseRoutes.js';
import sourceRoutes from './routes/sourceRoutes.js';
import claimRoutes from './routes/claimRoutes.js';
import spanRoutes from './routes/spanRoutes.js';
import handoverRoutes from './routes/handoverRoutes.js';
import demoRoutes from './routes/demoRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security: Helmet HTTP Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow inline styles/scripts for demo widgets
  })
);

// CORS configuration
app.use(
  cors({
    origin: true, // Allow frontend dev server and production origins
    credentials: true,
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // generous hackathon demo limit
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'Rate limit reached, please try again in a few minutes.',
  },
});
app.use(limiter);

// Request body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Relay Backend API',
    version: '1.0.0',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/cases/:id/sources', sourceRoutes);
app.use('/api', handoverRoutes);
app.use('/api', claimRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/spans', spanRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/demo', demoRoutes);

// In production, serve built client files if present
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  console.log(`[Relay] Serving static frontend from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  console.log(`[Relay] No static frontend found at: ${clientDistPath}. API-only mode active.`);
}

// 404 Handler for API
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handler (Never expose raw stack traces)
app.use((err, req, res, next) => {
  console.error('[Relay Error]', err.message);

  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'An unexpected internal server error occurred. Please try again.'
      : err.message || 'An error occurred processing your request.';

  res.status(status).json({
    error: err.name || 'ServerError',
    message,
    status,
  });
});

export default app;
