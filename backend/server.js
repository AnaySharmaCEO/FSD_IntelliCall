import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import leadRoutes from './routes/leadRoutes.js';

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
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/leads', leadRoutes);

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

// Start listening if run directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`IntelliCall Express API running on port ${PORT}`);
  });
}

export default app;
