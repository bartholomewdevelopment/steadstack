const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/', async (req, res) => {
  const healthcheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    },
  };

  try {
    // Quick DB ping
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      healthcheck.database.latency = 'ok';
    }
    res.json(healthcheck);
  } catch (error) {
    healthcheck.status = 'degraded';
    healthcheck.database.error = error.message;
    res.status(503).json(healthcheck);
  }
});

module.exports = router;
