/**
 * Usage Backfill Script
 *
 * Counts existing resources for each tenant and populates the usage collection.
 * This ensures accurate usage tracking for existing tenants.
 *
 * Usage: node packages/backend/src/scripts/backfill-usage.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { db, admin } = require('../config/firebase-admin');
const { FieldValue } = admin.firestore;

// MongoDB models
const Tenant = require('../models/Tenant');
const Site = require('../models/Site');
const Contact = require('../models/Contact');

async function backfillUsage() {
  console.log('Starting usage backfill...');

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/steadstack';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get all FIRESTORE tenants (these are the actual tenant IDs used)
    const firestoreTenantsSnapshot = await db.collection('tenants').get();
    console.log(`Found ${firestoreTenantsSnapshot.size} Firestore tenants to process`);

    let processed = 0;
    let errors = 0;

    for (const tenantDoc of firestoreTenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();
      console.log(`\nProcessing tenant: ${tenantData.name || 'Unknown'} (${tenantId})`);

      try {
        // MongoDB resources use a different tenantId - we need to find the mapping
        // Check if there's a user in this Firestore tenant that links to MongoDB
        let sitesCount = 0;
        let contactsCount = 0;

        // Try to find the MongoDB tenant ID by looking at user data
        const usersSnapshot = await db.collection('tenants').doc(tenantId).collection('users').limit(1).get();
        if (!usersSnapshot.empty) {
          const userData = usersSnapshot.docs[0].data();
          // The user may have a mongoTenantId or we need to look up by email in MongoDB
          if (userData.mongoTenantId) {
            const mongoId = userData.mongoTenantId;
            sitesCount = await Site.countDocuments({ tenantId: mongoId, status: { $ne: 'archived' } });
            contactsCount = await Contact.countDocuments({ tenantId: mongoId, isActive: true });
          } else if (userData.email) {
            // Try to find by email in MongoDB User model
            const User = require('../models/User');
            const mongoUser = await User.findOne({ email: userData.email }).populate('tenantId');
            if (mongoUser?.tenantId) {
              const mongoTenantId = mongoUser.tenantId._id || mongoUser.tenantId;
              sitesCount = await Site.countDocuments({ tenantId: mongoTenantId, status: { $ne: 'archived' } });
              contactsCount = await Contact.countDocuments({ tenantId: mongoTenantId, isActive: true });
            }
          }
        }

        console.log(`  MongoDB - Sites: ${sitesCount}, Contacts: ${contactsCount}`);

        // Count Firestore resources
        let animalsCount = 0;
        let inventoryItemsCount = 0;
        let activeTasksCount = 0;
        let runlistsCount = 0;
        let usersCount = 0;

        try {
          // Count animals (including groups as each group counts toward limit)
          const animalGroupsSnapshot = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('animalGroups')
            .where('status', '!=', 'ARCHIVED')
            .get();
          animalsCount = animalGroupsSnapshot.size;

          // Count individual animals too
          const animalsSnapshot = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('animals')
            .where('status', '!=', 'ARCHIVED')
            .get();
          animalsCount += animalsSnapshot.size;

          // Count inventory items
          const inventorySnapshot = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('inventoryItems')
            .where('active', '==', true)
            .get();
          inventoryItemsCount = inventorySnapshot.size;

          // Count task templates (active tasks)
          const taskTemplatesSnapshot = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('taskTemplates')
            .where('isActive', '==', true)
            .get();
          activeTasksCount = taskTemplatesSnapshot.size;

          // Count runlists
          const runlistsSnapshot = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('runlists')
            .where('status', '!=', 'ARCHIVED')
            .get();
          runlistsCount = runlistsSnapshot.size;

          // Count users
          const usersSnapshot = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('users')
            .get();
          usersCount = usersSnapshot.size;

          console.log(`  Firestore - Animals: ${animalsCount}, Inventory: ${inventoryItemsCount}, Tasks: ${activeTasksCount}, Runlists: ${runlistsCount}, Users: ${usersCount}`);
        } catch (firestoreError) {
          console.warn(`  Warning: Error counting Firestore resources:`, firestoreError.message);
        }

        // Calculate billing cycle dates
        const billingCycleStart = tenantData.billingCycleStart?.toDate?.() || tenantData.createdAt?.toDate?.() || new Date();
        const billingCycleEnd = new Date(billingCycleStart);
        billingCycleEnd.setMonth(billingCycleEnd.getMonth() + 1);

        // Create or update usage document
        const usageRef = db.collection('tenants').doc(tenantId).collection('usage').doc('current');

        const usageData = {
          billingCycleStart: admin.firestore.Timestamp.fromDate(new Date(billingCycleStart)),
          billingCycleEnd: admin.firestore.Timestamp.fromDate(billingCycleEnd),

          // Monthly counters (start fresh - we can't accurately count historical monthly usage)
          eventsThisCycle: 0,
          posThisCycle: 0,
          billsThisCycle: 0,

          // Cumulative counters from actual counts
          sites: sitesCount,
          users: usersCount,
          animals: animalsCount,
          activeTasks: activeTasksCount,
          runlists: runlistsCount,
          inventoryItems: inventoryItemsCount,
          contacts: contactsCount,

          lastUpdated: FieldValue.serverTimestamp(),
          backfilledAt: FieldValue.serverTimestamp(),
        };

        await usageRef.set(usageData, { merge: true });

        console.log(`  Usage document created/updated successfully`);
        processed++;

      } catch (error) {
        console.error(`  Error processing tenant ${tenantData.name || tenantId}:`, error);
        errors++;
      }
    }

    console.log('\n=== Backfill Summary ===');
    console.log(`Tenants processed: ${processed}`);
    console.log(`Errors: ${errors}`);

  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run if executed directly
if (require.main === module) {
  backfillUsage()
    .then(() => {
      console.log('Backfill complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Backfill failed:', error);
      process.exit(1);
    });
}

module.exports = { backfillUsage };
