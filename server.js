import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db.js';
import { configureSession } from './config/session.js';
import { verifyCsrf } from './middleware/csrf.middleware.js';
import authRoutes from './routes/auth.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security HTTP headers
app.use(helmet());

// CORS configuration - mandatory for session cookies across client and server
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true, // Allow cookies to be sent and received
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-XSRF-Token'],
  })
);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Server-side Session Management with MongoStore
app.use(configureSession());

// CSRF Protection (verifies mutating requests)
app.use(verifyCsrf);

// Base Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Subscription Product Support Desk Auth Service',
    timestamp: new Date().toISOString(),
    sessionActive: Boolean(req.session?.userId),
  });
});

// Authentication Routes
app.use('/api/auth', authRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start Server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[Support Desk Auth Service] Running on port ${PORT}`);
    console.log(`[CORS Allowed Origin]: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  });
};

// Only listen if executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
