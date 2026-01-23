const express = require('express');
const config = require('../config');

const router = express.Router();

/**
 * GET /api/pricing
 * Get pricing tiers configuration
 */
router.get('/', (req, res) => {
  const { pricing } = config;

  res.json({
    success: true,
    data: {
      plans: Object.entries(pricing).map(([key, plan]) => ({
        id: key,
        ...plan,
      })),
    },
  });
});

module.exports = router;
