// SteadStack FARMS API - v1.0.1
const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();

// MongoDB connection state
let isConnected = false;

// Connect to MongoDB (with caching for serverless)
const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('MONGODB_URI not configured');
    return;
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    isConnected = false;
  }
};

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: true,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Connect to DB before handling requests
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Import routes (copied from backend)
const routes = require('./routes');

// API routes - handle both /api/* (from direct calls) and /* (from hosting rewrite)
app.use('/api', routes);
app.use('/', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// Export the Express app as a Cloud Function (v2 API)
exports.api = onRequest(
  {
    timeoutSeconds: 60,
    memory: '512MiB',
    region: 'us-central1',
    invoker: 'public', // Allow unauthenticated access
  },
  app
);
