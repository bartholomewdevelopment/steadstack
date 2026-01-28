/**
 * Plan Migration Script
 *
 * Migrates existing tenants from old plan names to new plan names:
 * - starter -> free
 * - professional -> homestead
 * - enterprise -> ranchPro
 *
 * Also sets billingCycleStart for existing tenants.
 *
 * Usage: node packages/backend/src/scripts/migrate-plans.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { db, admin } = require('../config/firebase-admin');

// MongoDB Tenant model
const Tenant = require('../models/Tenant');

// Plan name mapping
const PLAN_MIGRATION_MAP = {
  starter: 'free',
  professional: 'homestead',
  enterprise: 'ranchPro',
};

async function migratePlans() {
  console.log('Starting plan migration...');

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/steadstack';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find all tenants that need migration
    const tenantsToMigrate = await Tenant.find({
      plan: { $in: Object.keys(PLAN_MIGRATION_MAP) },
    });

    console.log(`Found ${tenantsToMigrate.length} tenants to migrate`);

    let migrated = 0;
    let errors = 0;

    for (const tenant of tenantsToMigrate) {
      try {
        const oldPlan = tenant.plan;
        const newPlan = PLAN_MIGRATION_MAP[oldPlan];

        // Update MongoDB tenant
        tenant.plan = newPlan;
        tenant.billingCycleStart = tenant.billingCycleStart || tenant.createdAt || new Date();
        await tenant.save();

        // Also update Firestore tenant if it exists
        try {
          const firestoreTenantRef = db.collection('tenants').doc(tenant._id.toString());
          const firestoreTenant = await firestoreTenantRef.get();

          if (firestoreTenant.exists) {
            await firestoreTenantRef.update({
              plan: newPlan,
              billingCycleStart: admin.firestore.Timestamp.fromDate(tenant.billingCycleStart),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`  Migrated Firestore tenant: ${tenant.name}`);
          }
        } catch (firestoreError) {
          console.warn(`  Warning: Could not update Firestore for tenant ${tenant.name}:`, firestoreError.message);
        }

        console.log(`Migrated tenant: ${tenant.name} (${tenant._id}) from ${oldPlan} to ${newPlan}`);
        migrated++;
      } catch (error) {
        console.error(`Error migrating tenant ${tenant.name}:`, error);
        errors++;
      }
    }

    // Also set billingCycleStart for any tenants that don't have it
    const tenantsWithoutBillingCycle = await Tenant.find({
      billingCycleStart: { $exists: false },
    });

    console.log(`\nFound ${tenantsWithoutBillingCycle.length} tenants without billingCycleStart`);

    for (const tenant of tenantsWithoutBillingCycle) {
      try {
        tenant.billingCycleStart = tenant.createdAt || new Date();
        await tenant.save();
        console.log(`Set billingCycleStart for tenant: ${tenant.name}`);
      } catch (error) {
        console.error(`Error setting billingCycleStart for tenant ${tenant.name}:`, error);
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Tenants migrated: ${migrated}`);
    console.log(`Errors: ${errors}`);
    console.log(`Tenants with billing cycle set: ${tenantsWithoutBillingCycle.length}`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run if executed directly
if (require.main === module) {
  migratePlans()
    .then(() => {
      console.log('Migration complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migratePlans, PLAN_MIGRATION_MAP };
