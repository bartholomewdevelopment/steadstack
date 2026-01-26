const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

module.exports = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/steadstack',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Pricing configuration (config-driven, easy to update)
  pricing: {
    starter: {
      name: 'Free',
      price: 0,
      priceAnnual: 0,
      description: 'For very small homesteads',
      features: [
        'Up to 1 site',
        'Up to 5 head of livestock',
        'Up to 10 tasks total',
        'Up to 2 task lists',
        'Basic event tracking',
        'No inventory or purchasing',
        'Email support',
      ],
      limits: {
        sites: 1,
        animals: 5,
        users: 2,
        tasks: 10,
        taskLists: 2,
      },
    },
    professional: {
      name: 'Full Access',
      price: 34.99,
      priceAnnual: 0,
      description: 'Everything SteadStack offers',
      features: [
        'Unlimited sites',
        'Unlimited livestock tracking',
        'Unlimited tasks and lists',
        'Full inventory and purchasing',
        'Full double-entry accounting',
        'Reports and analytics',
        'Priority email support',
      ],
      limits: {
        sites: -1,
        animals: -1,
        users: 10,
        tasks: -1,
        taskLists: -1,
      },
    },
  },
};
