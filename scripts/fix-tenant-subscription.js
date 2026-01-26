/**
 * One-time script to fix tenant subscription data
 * Merges duplicate tenants and ensures correct subscription status
 */
require('dotenv').config({ path: require('path').join(__dirname, '../functions/.env') });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

// Define schemas inline for script
const tenantSchema = new mongoose.Schema({
  name: String,
  slug: String,
  plan: String,
  status: String,
  firestoreId: String,
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  subscriptionStatus: String,
  currentPeriodEnd: Date,
  cancelAtPeriodEnd: Boolean,
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  email: String,
  tenantId: mongoose.Schema.Types.ObjectId,
  firestoreTenantId: String,
}, { timestamps: true });

const Tenant = mongoose.model('Tenant', tenantSchema);
const User = mongoose.model('User', userSchema);

async function fixTenantSubscription() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected!\n');

    // Find user by email
    const user = await User.findOne({ email: 'contact@joeybartholomew.com' });
    if (!user) {
      console.log('User not found!');
      return;
    }

    console.log(`User found: ${user._id}`);
    console.log(`  Current tenantId: ${user.tenantId}`);

    // Find the webhook-created tenant with subscription
    const webhookTenantId = '6977274b405792079a27e813';
    const webhookTenant = await Tenant.findById(webhookTenantId);

    if (!webhookTenant) {
      console.log(`Webhook tenant ${webhookTenantId} not found!`);
      return;
    }

    console.log(`\nWebhook tenant found:`);
    console.log(`  plan: ${webhookTenant.plan}`);
    console.log(`  subscriptionStatus: ${webhookTenant.subscriptionStatus}`);
    console.log(`  stripeCustomerId: ${webhookTenant.stripeCustomerId}`);

    if (webhookTenant.subscriptionStatus !== 'active') {
      console.log('\nWebhook tenant does not have active subscription!');
      return;
    }

    console.log('\n--- FIXING ---');
    console.log(`Copying subscription data from ${webhookTenantId} to ${user.tenantId}`);

    // Update the user's tenant with subscription info
    const result = await Tenant.findByIdAndUpdate(user.tenantId, {
      plan: webhookTenant.plan,
      status: webhookTenant.status,
      stripeCustomerId: webhookTenant.stripeCustomerId,
      stripeSubscriptionId: webhookTenant.stripeSubscriptionId,
      subscriptionStatus: webhookTenant.subscriptionStatus,
      currentPeriodEnd: webhookTenant.currentPeriodEnd,
      cancelAtPeriodEnd: webhookTenant.cancelAtPeriodEnd,
    }, { new: true });

    console.log('\nUpdated user tenant with subscription info:');
    console.log(`  plan: ${result.plan}`);
    console.log(`  subscriptionStatus: ${result.subscriptionStatus}`);
    console.log(`  stripeCustomerId: ${result.stripeCustomerId}`);

    // Delete the duplicate webhook-created tenant
    await Tenant.findByIdAndDelete(webhookTenantId);
    console.log(`\nDeleted duplicate tenant: ${webhookTenantId}`);

    console.log('\n✅ Fix complete! User account now has active subscription.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixTenantSubscription();
