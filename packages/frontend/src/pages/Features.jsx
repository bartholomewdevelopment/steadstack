import { Link } from 'react-router-dom';

const featureCategories = [
  {
    title: 'Event Tracking',
    description: 'Every farm activity in one place',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    features: [
      {
        name: 'Operational Events',
        description: 'Log feeding, treatments, breeding, harvests, maintenance, and any custom activity type.',
      },
      {
        name: 'Recurring Tasks',
        description: 'Set up repeating events for daily chores. Never miss a feeding or medication schedule.',
      },
      {
        name: 'Work Orders',
        description: 'Create and assign work orders to team members. Track completion and time spent.',
      },
      {
        name: 'Event Templates',
        description: 'Save common activities as templates. Log routine tasks in seconds.',
      },
      {
        name: 'Batch Operations',
        description: 'Apply the same event to multiple animals or locations at once.',
      },
      {
        name: 'Mobile Entry',
        description: 'Log events from the field on your phone. Works offline, syncs when connected.',
      },
    ],
  },
  {
    title: 'Inventory Management',
    description: 'Track every bag, bale, and barrel',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
    features: [
      {
        name: 'Automatic Deductions',
        description: 'When you log an event, inventory adjusts automatically. Feed the animals, feed stock decreases.',
      },
      {
        name: 'Reorder Alerts',
        description: 'Set minimum thresholds. Get notified when it\'s time to reorder.',
      },
      {
        name: 'Purchase Orders',
        description: 'Generate POs directly from reorder alerts. Track order status through delivery.',
      },
      {
        name: 'Multi-Location',
        description: 'Track inventory across barns, fields, and storage facilities separately.',
      },
      {
        name: 'Lot Tracking',
        description: 'Track batches with expiration dates, suppliers, and certifications.',
      },
      {
        name: 'Usage Reports',
        description: 'See consumption trends over time. Optimize ordering and reduce waste.',
      },
    ],
  },
  {
    title: 'Financial Tracking',
    description: 'Know your true profitability',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    features: [
      {
        name: 'Double-Entry Ledger',
        description: 'Real accounting. Every transaction creates balanced debits and credits.',
      },
      {
        name: 'Cost Tracking',
        description: 'Track costs per animal, per field, per activity. Know what everything really costs.',
      },
      {
        name: 'Event-to-Ledger Link',
        description: 'Every financial entry traces back to its source event. Full audit trail.',
      },
      {
        name: 'Profit & Loss Reports',
        description: 'See income and expenses by category, time period, site, or enterprise.',
      },
      {
        name: 'Balance Sheet',
        description: 'Track assets, liabilities, and equity. Know your net worth at any time.',
      },
      {
        name: 'Tax-Ready Reports',
        description: 'Export data in formats your accountant will love. Schedule F ready.',
      },
    ],
  },
  {
    title: 'Multi-Site Management',
    description: 'All your properties, one dashboard',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    features: [
      {
        name: 'Site Isolation',
        description: 'Each property has its own inventory, events, and team. Data stays organized.',
      },
      {
        name: 'Consolidated Reports',
        description: 'Roll up financials across all sites for the big picture.',
      },
      {
        name: 'Cross-Site Transfers',
        description: 'Move inventory between locations. Track in-transit items.',
      },
      {
        name: 'Site Comparison',
        description: 'Compare performance across properties. Identify best practices.',
      },
      {
        name: 'Site-Specific Roles',
        description: 'Give team members access to specific sites only.',
      },
      {
        name: 'Centralized Setup',
        description: 'Define item types, event types, and chart of accounts once, use everywhere.',
      },
    ],
  },
];

const integrations = [
  { name: 'QuickBooks', description: 'Sync transactions to your accounting software' },
  { name: 'Xero', description: 'Automatic journal entry export' },
  { name: 'Weather APIs', description: 'Log weather conditions with events' },
  { name: 'Equipment GPS', description: 'Track equipment location and usage' },
  { name: 'Scale Systems', description: 'Auto-log weights from connected scales' },
  { name: 'Custom Webhooks', description: 'Connect to any system via API' },
];

export default function Features() {
  return (
    <div>
      {/* Header */}
      <section className="bg-gradient-to-b from-primary-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-gray-900">
            Built for Real Farm Work
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Not another generic business tool. SteadStack is designed from the ground up
            for agricultural operations.
          </p>
        </div>
      </section>

      {/* Feature Categories */}
      {featureCategories.map((category, categoryIndex) => (
        <section
          key={categoryIndex}
          className={`section ${categoryIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 mb-12">
              <div className="w-16 h-16 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                {category.icon}
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900">
                  {category.title}
                </h2>
                <p className="text-gray-600">{category.description}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {category.features.map((feature, featureIndex) => (
                <div
                  key={featureIndex}
                  className="p-6 rounded-xl border border-gray-200 bg-white hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-lg font-semibold text-gray-900">{feature.name}</h3>
                  <p className="mt-2 text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Integrations Section */}
      <section className="section bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
              Integrations
            </h2>
            <p className="mt-4 text-primary-100">
              Connect SteadStack with your existing tools (Full Access plan)
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {integrations.map((integration, index) => (
              <div
                key={index}
                className="p-6 rounded-xl bg-primary-700 hover:bg-primary-800 transition-colors"
              >
                <h3 className="text-lg font-semibold text-white">{integration.name}</h3>
                <p className="mt-2 text-primary-200">{integration.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="section bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900">
              Enterprise-Grade Security
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              { title: 'Data Encryption', description: 'All data encrypted at rest and in transit using AES-256.' },
              { title: 'Daily Backups', description: 'Automatic daily backups with 30-day retention.' },
              { title: 'Role-Based Access', description: 'Control who sees and does what with granular permissions.' },
              { title: 'Audit Logging', description: 'Every action logged for compliance and review.' },
            ].map((item, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-1 text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-display font-bold text-gray-900">
            See It in Action
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Start your free trial and explore all features with sample data.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup" className="btn-primary btn-lg">
              Start Free
            </Link>
            <Link to="/contact" className="btn-secondary btn-lg">
              Request Demo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
