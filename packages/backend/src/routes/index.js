const express = require('express');
const healthRoutes = require('./health');
const contactRoutes = require('./contact');
const pricingRoutes = require('./pricing');
const authRoutes = require('./auth');
const sitesRoutes = require('./sites');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/contact', contactRoutes);
router.use('/pricing', pricingRoutes);
router.use('/auth', authRoutes);
router.use('/sites', sitesRoutes);

module.exports = router;
