const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Tenant = require('../models/Tenant');

// Initialize Stripe lazily
const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  return require('stripe')(key);
};

// Helper to find tenant by either MongoDB ID or Firestore ID
const findTenant = async (tenantId) => {
  // Check if it's a valid MongoDB ObjectId
  if (mongoose.Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {
    return Tenant.findById(tenantId);
  }
  // Otherwise, look up by firestoreId
  return Tenant.findOne({ firestoreId: tenantId });
};

// Create checkout session for subscription
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { tenantId, userId, userEmail } = req.body;

    if (!tenantId || !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'tenantId and userEmail are required',
      });
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return res.status(500).json({
        success: false,
        message: 'Stripe price not configured',
      });
    }

    // Try to find existing tenant, but don't require it
    const tenant = await findTenant(tenantId);

    // If tenant exists and has active subscription, block
    if (tenant && tenant.subscriptionStatus === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Tenant already has an active subscription',
      });
    }

    const stripe = getStripe();

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        // Store both IDs - use MongoDB ID if available, otherwise Firestore ID
        tenantId: tenant ? tenant._id.toString() : tenantId,
        firestoreId: tenantId,
        userId: userId || '',
      },
      success_url: `${process.env.CORS_ORIGIN || 'https://stead-stack.web.app'}/app/settings?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.CORS_ORIGIN || 'https://stead-stack.web.app'}/app/settings?canceled=true`,
    });

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create checkout session',
    });
  }
});

// Get subscription status for a tenant
router.get('/subscription/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const tenant = await findTenant(tenantId);

    if (!tenant) {
      // Return default free plan status if tenant not found in MongoDB
      return res.json({
        success: true,
        data: {
          plan: 'starter',
          status: 'trial',
          subscriptionStatus: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          hasActiveSubscription: false,
        },
      });
    }

    res.json({
      success: true,
      data: {
        plan: tenant.plan,
        status: tenant.status,
        subscriptionStatus: tenant.subscriptionStatus,
        currentPeriodEnd: tenant.currentPeriodEnd,
        cancelAtPeriodEnd: tenant.cancelAtPeriodEnd,
        hasActiveSubscription: tenant.subscriptionStatus === 'active',
      },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription status',
    });
  }
});

// Create customer portal session (for managing subscription)
router.post('/create-portal-session', async (req, res) => {
  try {
    const { tenantId } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'tenantId is required',
      });
    }

    const tenant = await findTenant(tenantId);
    if (!tenant || !tenant.stripeCustomerId) {
      return res.status(404).json({
        success: false,
        message: 'No subscription found for this tenant',
      });
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${process.env.CORS_ORIGIN || 'https://stead-stack.web.app'}/app/settings`,
    });

    res.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create portal session',
    });
  }
});

module.exports = router;
