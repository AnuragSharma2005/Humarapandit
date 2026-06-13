import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import crmRoutes from './routes/crmRoutes.js';
import syncRoutes from './routes/syncRoutes.js';
import astrologyRoutes from './routes/astrologyRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env files in priority order:
// 1. Current working directory .env
dotenv.config();
// 2. Local backend/.env
dotenv.config({ path: path.resolve(__dirname, '.env') });
// 3. Parent root-level .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('DEBUG: process.env.MONGO_URI =', process.env.MONGO_URI);

// Connect to Database
connectDB();

const app = express();

// Middlewares
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://hamarapandit.onrender.com',
  'https://hamarapandit1.vercel.app',
  process.env.FRONTEND_URL,        // optional: set in Render dashboard
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Astrology CRM Backend API is active',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/astrology', astrologyRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
