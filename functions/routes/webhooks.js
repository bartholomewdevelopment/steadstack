const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Tenant = require('../models/Tenant');

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
          // Try to find existing tenant
          let tenant = await findTenant(tenantId) || await findTenant(firestoreId);

          if (tenant) {
            // Update existing tenant
            tenant.subscriptionStatus = 'active';
            tenant.plan = 'professional';
            tenant.stripeCustomerId = session.customer;
            tenant.stripeSubscriptionId = session.subscription;
            tenant.status = 'active';
            if (firestoreId && !tenant.firestoreId) {
              tenant.firestoreId = firestoreId;
            }
            await tenant.save();
            console.log(`Tenant ${tenant._id} upgraded to professional`);
          } else if (firestoreId) {
            // Create new tenant in MongoDB linked to Firestore
            const slug = `tenant-${firestoreId.toLowerCase().substring(0, 8)}-${Date.now().toString(36)}`;
            tenant = await Tenant.create({
              name: customerEmail ? `${customerEmail.split('@')[0]}'s Farm` : 'New Farm',
              slug,
              firestoreId,
              plan: 'professional',
              status: 'active',
              subscriptionStatus: 'active',
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
            });
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
          tenant.subscriptionStatus = subscription.status;
          tenant.stripeSubscriptionId = subscription.id;
          tenant.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
          await tenant.save();
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('Subscription updated:', subscription.id);

        const tenant = await Tenant.findOne({ stripeSubscriptionId: subscription.id });
        if (tenant) {
          tenant.subscriptionStatus = subscription.status;
          tenant.currentPeriodEnd = new Date(subscription.current_period_end * 1000);

          // Check if downgraded/cancelled
          if (subscription.cancel_at_period_end) {
            tenant.cancelAtPeriodEnd = true;
          }
          await tenant.save();
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
          tenant.subscriptionTier = 'starter';
          tenant.stripeSubscriptionId = null;
          tenant.cancelAtPeriodEnd = false;
          await tenant.save();
          console.log(`Tenant ${tenant._id} downgraded to starter`);
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
