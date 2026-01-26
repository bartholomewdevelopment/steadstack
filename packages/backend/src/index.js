const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const routes = require('./routes');

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

// Rate limiting - more permissive in development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'development' ? 1000 : 100, // higher limit for dev
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  // Skip rate limiting for auth endpoints in development (React Strict Mode causes double mounts)
  skip: (req) => config.nodeEnv === 'development' && req.path.startsWith('/api/auth'),
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// API routes
app.use('/api', routes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'SteadStack API',
    version: '0.1.0',
    status: 'running',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
  });
});

// Database connection and server start
const startServer = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('MongoDB connected successfully');

    app.listen(config.port, () => {
      console.log(`SteadStack API running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    // Start server anyway for development (allows testing without DB)
    if (config.nodeEnv === 'development') {
      console.log('Starting server without database connection...');
      app.listen(config.port, () => {
        console.log(`SteadStack API running on port ${config.port} (no database)`);
      });
    } else {
      process.exit(1);
    }
  }
};

startServer();

module.exports = app;
