import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import callRoutes from './routes/callRoutes.js';
import decisionRoutes from './routes/decisionRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import complianceRoutes from './routes/complianceRoutes.js';
import phoneNumberRoutes from './routes/phoneNumberRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import storageRoutes from './routes/storageRoutes.js';

// Service Imports
import { startCallScheduler } from './services/schedulerService.js';

// Load environment variables from .env file
dotenv.config();

const app = express();

// Enable JSON request body parsing
app.use(express.json());

// Configure CORS using environment variable for frontend origin
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));

// Health-check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'IntelliCall Express API is running',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/leads', leadRoutes);
app.use('/api/v1/agents', agentRoutes);
app.use('/api/v1/campaigns', campaignRoutes);
app.use('/api/v1/calls', callRoutes);
app.use('/api/v1/decisions', decisionRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/compliance', complianceRoutes);
app.use('/api/v1/phone-numbers', phoneNumberRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/storage', storageRoutes);

// 404 Handler for unknown routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global centralized error-handling middleware (must be registered after routes)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start listening and background workers if run directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`IntelliCall Express API running on port ${PORT}`);
    // Start background scheduler to check for due scheduled calls every 60s
    startCallScheduler(60000);
  });
}

export default app;
