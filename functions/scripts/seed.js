/**
 * Seed script for SteadStack
 * Run with: npm run seed
 *
 * Creates demo data for testing and development
 */

require('dotenv').config();
const mongoose = require('mongoose');
const config = require('../config');
const { Tenant, ContactInquiry, Site, InventoryItem, Account } = require('../models');
const { createDefaultAccounts } = require('../services/accountSetup');

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

// Sites for Demo Farm
const getSitesForTenant = (tenantId, userId) => [
  {
    tenantId,
    name: 'Main Farm',
    code: 'MF',
    type: 'farm',
    acreage: 120,
    address: {
      street: '1234 Country Road',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
    },
    isActive: true,
    createdBy: userId,
  },
  {
    tenantId,
    name: 'North Pasture',
    code: 'NP',
    type: 'pasture',
    acreage: 45,
    address: {
      street: '1236 Country Road',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
    },
    isActive: true,
    createdBy: userId,
  },
];

// Inventory items for Demo Farm
const getInventoryItemsForTenant = (tenantId, userId) => [
  {
    tenantId,
    name: 'Cattle Feed - 16% Protein',
    sku: 'CF-16P',
    category: 'feed',
    unit: 'lbs',
    defaultUnitCost: 0.25,
    totalQuantity: 5000,
    reorderPoint: 1000,
    reorderQuantity: 2500,
    preferredVendor: { name: 'Local Feed Mill', contactInfo: '(555) 111-2222' },
    createdBy: userId,
  },
  {
    tenantId,
    name: 'Hay - Alfalfa',
    sku: 'HAY-ALF',
    category: 'feed',
    unit: 'bales',
    defaultUnitCost: 8.50,
    totalQuantity: 200,
    reorderPoint: 50,
    reorderQuantity: 100,
    createdBy: userId,
  },
  {
    tenantId,
    name: 'Ivermectin Pour-On',
    sku: 'MED-IVM',
    category: 'medicine',
    unit: 'ml',
    defaultUnitCost: 0.75,
    totalQuantity: 500,
    reorderPoint: 100,
    reorderQuantity: 250,
    preferredVendor: { name: 'Valley Vet Supply', contactInfo: '(800) 555-1234' },
    createdBy: userId,
  },
  {
    tenantId,
    name: 'Penicillin Injectable',
    sku: 'MED-PEN',
    category: 'medicine',
    unit: 'ml',
    defaultUnitCost: 0.45,
    totalQuantity: 250,
    reorderPoint: 50,
    reorderQuantity: 100,
    createdBy: userId,
  },
  {
    tenantId,
    name: 'Ear Tags (100 pack)',
    sku: 'SUP-TAG',
    category: 'supplies',
    unit: 'each',
    defaultUnitCost: 1.25,
    totalQuantity: 150,
    reorderPoint: 50,
    reorderQuantity: 100,
    createdBy: userId,
  },
  {
    tenantId,
    name: 'Diesel Fuel',
    sku: 'FUEL-DSL',
    category: 'fuel',
    unit: 'gallons',
    defaultUnitCost: 3.75,
    totalQuantity: 250,
    reorderPoint: 50,
    reorderQuantity: 200,
    createdBy: userId,
  },
];

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
      Site.deleteMany({}),
      InventoryItem.deleteMany({}),
      Account.deleteMany({}),
    ]);
    console.log('Existing data cleared');

    // Seed tenants
    console.log('\nSeeding tenants...');
    const tenants = await Tenant.insertMany(seedData.tenants);
    console.log(`Created ${tenants.length} tenants:`);
    tenants.forEach((t) => console.log(`  - ${t.name} (${t.slug})`));

    // Get demo farm tenant
    const demoFarm = tenants.find((t) => t.slug === 'demo-farm');

    // Create a fake user ID for seeding (would normally come from Firebase)
    const fakeUserId = new mongoose.Types.ObjectId();

    // Seed sites for Demo Farm
    console.log('\nSeeding sites for Demo Farm...');
    const sites = await Site.insertMany(getSitesForTenant(demoFarm._id, fakeUserId));
    console.log(`Created ${sites.length} sites:`);
    sites.forEach((s) => console.log(`  - ${s.name} (${s.code})`));

    // Seed inventory items for Demo Farm
    console.log('\nSeeding inventory items for Demo Farm...');
    const items = await InventoryItem.insertMany(getInventoryItemsForTenant(demoFarm._id, fakeUserId));
    console.log(`Created ${items.length} inventory items:`);
    items.forEach((i) => console.log(`  - ${i.name} (${i.sku})`));

    // Seed accounts for each tenant
    console.log('\nSeeding chart of accounts...');
    for (const tenant of tenants) {
      await createDefaultAccounts(tenant._id, fakeUserId);
      console.log(`  - Created accounts for ${tenant.name}`);
    }

    // Seed contact inquiries
    console.log('\nSeeding contact inquiries...');
    const inquiries = await ContactInquiry.insertMany(seedData.contactInquiries);
    console.log(`Created ${inquiries.length} contact inquiries`);

    console.log('\n========================================');
    console.log('Seed completed successfully!');
    console.log('========================================\n');

    console.log('Demo data summary:');
    console.log('  Tenant: demo-farm (Professional plan)');
    console.log(`  Sites: ${sites.length}`);
    console.log(`  Inventory Items: ${items.length}`);
    console.log(`  Chart of Accounts: Standard farm accounts created`);
    console.log('\n');

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
