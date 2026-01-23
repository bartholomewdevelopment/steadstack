require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/steadstack',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Pricing configuration (config-driven, easy to update)
  pricing: {
    starter: {
      name: 'Starter',
      price: 29,
      priceAnnual: 290,
      description: 'Perfect for small hobby farms',
      features: [
        'Up to 1 site',
        'Up to 50 animals',
        'Basic event tracking',
        'Simple inventory management',
        'Monthly reports',
        'Email support',
      ],
      limits: {
        sites: 1,
        animals: 50,
        users: 2,
      },
    },
    professional: {
      name: 'Professional',
      price: 79,
      priceAnnual: 790,
      description: 'For growing operations',
      features: [
        'Up to 5 sites',
        'Up to 500 animals',
        'Advanced event tracking',
        'Full inventory management',
        'Automated reorder alerts',
        'Basic accounting integration',
        'Weekly reports',
        'Priority email support',
      ],
      limits: {
        sites: 5,
        animals: 500,
        users: 10,
      },
    },
    enterprise: {
      name: 'Enterprise',
      price: 199,
      priceAnnual: 1990,
      description: 'For large commercial operations',
      features: [
        'Unlimited sites',
        'Unlimited animals',
        'Full event automation',
        'Complete inventory system',
        'Full double-entry accounting',
        'Custom integrations',
        'Real-time dashboards',
        'API access',
        'Dedicated account manager',
        'Phone support',
      ],
      limits: {
        sites: -1, // unlimited
        animals: -1,
        users: -1,
      },
    },
  },
};
