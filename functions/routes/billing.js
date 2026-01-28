const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Tenant = require('../models/Tenant');
const firestoreService = require('../services/firestore');

const PRICE_IDS = {
  homestead: {
    monthly: process.env.STRIPE_PRICE_HOMESTEAD_MONTHLY || 'price_1SuVhICN4d8r3Upqq4JXqLeY',
    annual: process.env.STRIPE_PRICE_HOMESTEAD_ANNUAL || 'price_1SuWJPCN4d8r3UpqfZIDYUsb',
  },
  ranchGrowth: {
    monthly: process.env.STRIPE_PRICE_RANCH_GROWTH_MONTHLY || 'price_1SuWFaCN4d8r3Upq32QHpoFG',
    annual: process.env.STRIPE_PRICE_RANCH_GROWTH_ANNUAL || 'price_1SuWKJCN4d8r3UpqAJyQd1gs',
  },
  ranchPro: {
    monthly: process.env.STRIPE_PRICE_RANCH_PRO_MONTHLY || 'price_1SuWHYCN4d8r3UpqLTB68PwP',
    annual: process.env.STRIPE_PRICE_RANCH_PRO_ANNUAL || 'price_1SuWKnCN4d8r3UpqjUNMoSuq',
  },
};

const getPlanFromPriceId = (priceId) => {
  if (!priceId) return null;
  for (const [plan, cycles] of Object.entries(PRICE_IDS)) {
    if (cycles.monthly === priceId || cycles.annual === priceId) {
      return plan;
    }
  }
  return null;
};

const getPriceId = (plan, billingCycle) => {
  if (!plan || plan === 'free') return null;
  const planConfig = PRICE_IDS[plan];
  if (!planConfig) return null;
  return planConfig[billingCycle] || planConfig.monthly;
};

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
    const { tenantId, userId, userEmail, plan, billingCycle = 'monthly' } = req.body;

    if (!tenantId || !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'tenantId and userEmail are required',
      });
    }

    if (!plan || plan === 'free') {
      return res.status(400).json({
        success: false,
        message: 'Paid plan required to start checkout',
      });
    }

    const priceId = getPriceId(plan, billingCycle);
    if (!priceId) {
      return res.status(500).json({
        success: false,
        message: 'Stripe price not configured for this plan',
      });
    }

    // Try to find existing tenant, but don't require it
    const tenant = await findTenant(tenantId);

    // If tenant has active subscription, send them to billing portal to upgrade/downgrade
    if (tenant && tenant.subscriptionStatus === 'active' && tenant.stripeCustomerId) {
      const stripe = getStripe();
      const session = await stripe.billingPortal.sessions.create({
        customer: tenant.stripeCustomerId,
        return_url: `${process.env.CORS_ORIGIN || 'https://stead-stack.web.app'}/app/settings?tab=billing`,
      });

      return res.json({
        success: true,
        url: session.url,
        mode: 'portal',
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
        plan,
        billingCycle,
        priceId,
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
          plan: 'free',
          status: 'trial',
          subscriptionStatus: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          hasActiveSubscription: false,
        },
      });
    }

    let plan = tenant.plan;
    let subscriptionStatus = tenant.subscriptionStatus;
    let currentPeriodEnd = tenant.currentPeriodEnd;
    let cancelAtPeriodEnd = tenant.cancelAtPeriodEnd;

    try {
      const stripe = getStripe();
      let subscription = null;

      if (tenant.stripeSubscriptionId) {
        subscription = await stripe.subscriptions.retrieve(tenant.stripeSubscriptionId, {
          expand: ['items.data.price'],
        });
      } else if (tenant.stripeCustomerId) {
        const subscriptions = await stripe.subscriptions.list({
          customer: tenant.stripeCustomerId,
          status: 'all',
          limit: 1,
        });
        subscription = subscriptions.data?.[0] || null;
      }

      if (subscription) {
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const mappedPlan = getPlanFromPriceId(priceId);
        if (mappedPlan) {
          plan = mappedPlan;
          tenant.plan = mappedPlan;
          // Keep Firestore in sync so usage summary uses the right plan
          if (tenant.firestoreId) {
            await firestoreService.updateTenant(tenant.firestoreId, { plan: mappedPlan });
          }
        }

        subscriptionStatus = subscription.status;
        currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        cancelAtPeriodEnd = !!subscription.cancel_at_period_end;

        tenant.subscriptionStatus = subscriptionStatus;
        tenant.currentPeriodEnd = currentPeriodEnd;
        tenant.cancelAtPeriodEnd = cancelAtPeriodEnd;
        if (!tenant.stripeSubscriptionId) {
          tenant.stripeSubscriptionId = subscription.id;
        }
        await tenant.save();
      }
    } catch (err) {
      console.warn('Failed to force sync subscription from Stripe:', err.message);
    }

    res.json({
      success: true,
      data: {
        plan,
        status: tenant.status,
        subscriptionStatus,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        hasActiveSubscription: subscriptionStatus === 'active',
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
