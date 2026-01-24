const express = require('express');
const healthRoutes = require('./health');
const contactRoutes = require('./contact');
const pricingRoutes = require('./pricing');
const authRoutes = require('./auth');
const sitesRoutes = require('./sites');
const eventsRoutes = require('./events');
const inventoryRoutes = require('./inventory');
const animalsRoutes = require('./animals');
const tasksRoutes = require('./tasks');
const adminRoutes = require('./admin');
const postingRoutes = require('./posting');
const accountingRoutes = require('./accounting');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/contact', contactRoutes);
router.use('/pricing', pricingRoutes);
router.use('/auth', authRoutes);
router.use('/sites', sitesRoutes);
router.use('/events', eventsRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/animals', animalsRoutes);
router.use('/tasks', tasksRoutes);
router.use('/admin', adminRoutes);
router.use('/posting', postingRoutes);
router.use('/accounting', accountingRoutes);

module.exports = router;
