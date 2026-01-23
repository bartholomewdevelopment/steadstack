/**
 * Seed script for SteadStack
 * Run with: npm run seed
 *
 * Creates demo data for testing and development
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config');
const { Tenant, ContactInquiry } = require('../models');

const seedData = {
  tenants: [
    {
      name: 'Demo Farm',
      slug: 'demo-farm',
      plan: 'professional',
      status: 'active',
      settings: {
        timezone: 'America/Chicago',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
      },
    },
    {
      name: 'Smith Family Ranch',
      slug: 'smith-family-ranch',
      plan: 'enterprise',
      status: 'active',
      settings: {
        timezone: 'America/Denver',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
      },
    },
    {
      name: 'Trial Farm',
      slug: 'trial-farm',
      plan: 'starter',
      status: 'trial',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      settings: {
        timezone: 'America/New_York',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
      },
    },
  ],
  contactInquiries: [
    {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '(555) 123-4567',
      farmName: 'Doe Dairy Farm',
      message: 'Interested in learning more about the professional plan for our 200-head dairy operation.',
      source: 'pricing_page',
      status: 'new',
    },
    {
      name: 'Sarah Johnson',
      email: 'sarah@johnsoncattle.com',
      phone: '(555) 987-6543',
      farmName: 'Johnson Cattle Co',
      message: 'Would like to schedule a demo. We have 5 different properties and need multi-site support.',
      source: 'contact_page',
      status: 'contacted',
    },
    {
      name: 'Mike Williams',
      email: 'mike@smallacres.com',
      farmName: 'Small Acres Hobby Farm',
      message: 'Just getting started with goats and chickens. Is the starter plan right for me?',
      source: 'homepage',
      status: 'new',
    },
  ],
};

async function seed() {
  console.log('Starting seed process...\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('\nClearing existing data...');
    await Promise.all([
      Tenant.deleteMany({}),
      ContactInquiry.deleteMany({}),
    ]);
    console.log('Existing data cleared');

    // Seed tenants
    console.log('\nSeeding tenants...');
    const tenants = await Tenant.insertMany(seedData.tenants);
    console.log(`Created ${tenants.length} tenants:`);
    tenants.forEach((t) => console.log(`  - ${t.name} (${t.slug})`));

    // Seed contact inquiries
    console.log('\nSeeding contact inquiries...');
    const inquiries = await ContactInquiry.insertMany(seedData.contactInquiries);
    console.log(`Created ${inquiries.length} contact inquiries`);

    console.log('\n========================================');
    console.log('Seed completed successfully!');
    console.log('========================================\n');

    console.log('Demo tenant credentials (for future auth segment):');
    console.log('  Tenant: demo-farm');
    console.log('  (Users will be added in Auth segment)\n');

  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run seed
seed();
