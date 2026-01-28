const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Tenant = require('../models/Tenant');
const firestoreService = require('../services/firestore');

const PRICE_PLAN_MAP = {
  // Homestead
  [process.env.STRIPE_PRICE_HOMESTEAD_MONTHLY || 'price_1SuVhICN4d8r3Upqq4JXqLeY']: 'homestead',
  [process.env.STRIPE_PRICE_HOMESTEAD_ANNUAL || 'price_1SuWJPCN4d8r3UpqfZIDYUsb']: 'homestead',
  // Ranch Growth
  [process.env.STRIPE_PRICE_RANCH_GROWTH_MONTHLY || 'price_1SuWFaCN4d8r3Upq32QHpoFG']: 'ranchGrowth',
  [process.env.STRIPE_PRICE_RANCH_GROWTH_ANNUAL || 'price_1SuWKJCN4d8r3UpqAJyQd1gs']: 'ranchGrowth',
  // Ranch Pro
  [process.env.STRIPE_PRICE_RANCH_PRO_MONTHLY || 'price_1SuWHYCN4d8r3UpqLTB68PwP']: 'ranchPro',
  [process.env.STRIPE_PRICE_RANCH_PRO_ANNUAL || 'price_1SuWKnCN4d8r3UpqjUNMoSuq']: 'ranchPro',
};

const getPlanFromPriceId = (priceId) => PRICE_PLAN_MAP[priceId] || null;

// Helper to find tenant by either MongoDB ID or Firestore ID
const findTenant = async (tenantId) => {
  if (!tenantId) return null;
  // Check if it's a valid MongoDB ObjectId
  if (mongoose.Types.ObjectId.isValid(tenantId) && tenantId.length === 24) {
    return Tenant.findById(tenantId);
  }
  // Otherwise, look up by firestoreId
  return Tenant.findOne({ firestoreId: tenantId });
};

// Stripe webhook handler
// Note: Raw body parsing is configured in main index.js for this route
router.post('/stripe', async (req, res) => {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout completed:', session.id);

        // Get customer email and metadata
        const customerEmail = session.customer_email || session.customer_details?.email;
        const tenantId = session.metadata?.tenantId;
        const firestoreId = session.metadata?.firestoreId;
        const userId = session.metadata?.userId;

        if (tenantId || firestoreId) {
          let plan = session.metadata?.plan;
          const priceId = session.metadata?.priceId;
          if (!plan && priceId) {
            plan = getPlanFromPriceId(priceId);
          }

          // Try to detect plan from subscription items if needed
          if (!plan && session.subscription) {
            try {
              const subscription = await stripe.subscriptions.retrieve(session.subscription, {
                expand: ['items.data.price'],
              });
              const subPriceId = subscription.items?.data?.[0]?.price?.id;
              plan = getPlanFromPriceId(subPriceId);
            } catch (err) {
              console.warn('Failed to fetch subscription price for plan mapping:', err.message);
            }
          }

          const resolvedPlan = plan || 'homestead';

          // Try to find existing tenant
          let tenant = await findTenant(tenantId) || await findTenant(firestoreId);

          if (tenant) {
            // Update existing tenant
            tenant.subscriptionStatus = 'active';
            tenant.plan = resolvedPlan;
            tenant.stripeCustomerId = session.customer;
            tenant.stripeSubscriptionId = session.subscription;
            tenant.status = 'active';
            if (firestoreId && !tenant.firestoreId) {
              tenant.firestoreId = firestoreId;
            }
            await tenant.save();
            if (tenant.firestoreId) {
              await firestoreService.updateTenant(tenant.firestoreId, { plan: resolvedPlan });
            } else if (firestoreId) {
              await firestoreService.updateTenant(firestoreId, { plan: resolvedPlan });
            }
            console.log(`Tenant ${tenant._id} upgraded to ${resolvedPlan}`);
          } else if (firestoreId) {
            // Create new tenant in MongoDB linked to Firestore
            const slug = `tenant-${firestoreId.toLowerCase().substring(0, 8)}-${Date.now().toString(36)}`;
            tenant = await Tenant.create({
              name: customerEmail ? `${customerEmail.split('@')[0]}'s Farm` : 'New Farm',
              slug,
              firestoreId,
              plan: resolvedPlan,
              status: 'active',
              subscriptionStatus: 'active',
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
            });
            await firestoreService.updateTenant(firestoreId, { plan: resolvedPlan });
            console.log(`Created new tenant ${tenant._id} for Firestore ${firestoreId}`);
          }
        }
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object;
        console.log('Subscription created:', subscription.id);

        // Find tenant by Stripe customer ID and update
        const tenant = await Tenant.findOne({ stripeCustomerId: subscription.customer });
        if (tenant) {
          const priceId = subscription.items?.data?.[0]?.price?.id;
          const plan = getPlanFromPriceId(priceId);
          tenant.subscriptionStatus = subscription.status;
          tenant.stripeSubscriptionId = subscription.id;
          tenant.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
          if (plan) tenant.plan = plan;
          await tenant.save();
          if (tenant.firestoreId) {
            await firestoreService.updateTenant(tenant.firestoreId, { plan: tenant.plan });
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('Subscription updated:', subscription.id);

        const tenant = await Tenant.findOne({ stripeSubscriptionId: subscription.id });
        if (tenant) {
          const priceId = subscription.items?.data?.[0]?.price?.id;
          const plan = getPlanFromPriceId(priceId);
          tenant.subscriptionStatus = subscription.status;
          tenant.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
          if (plan) tenant.plan = plan;

          // Check if downgraded/cancelled
          if (subscription.cancel_at_period_end) {
            tenant.cancelAtPeriodEnd = true;
          }
          await tenant.save();
          if (tenant.firestoreId) {
            await firestoreService.updateTenant(tenant.firestoreId, { plan: tenant.plan });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('Subscription deleted:', subscription.id);

        // Downgrade tenant to free tier
        const tenant = await Tenant.findOne({ stripeSubscriptionId: subscription.id });
        if (tenant) {
          tenant.subscriptionStatus = 'canceled';
          tenant.plan = 'free';
          tenant.stripeSubscriptionId = null;
          tenant.cancelAtPeriodEnd = false;
          await tenant.save();
          if (tenant.firestoreId) {
            await firestoreService.updateTenant(tenant.firestoreId, { plan: 'free' });
          }
          console.log(`Tenant ${tenant._id} downgraded to free`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
