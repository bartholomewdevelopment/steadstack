import { Link } from 'react-router-dom';

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    title: 'Events & Tasks',
    description: 'Log every farm activity. Feeding, treatments, breeding, harvests. Set recurring tasks and never miss a schedule.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
    title: 'Asset Tracking',
    description: 'Track livestock, equipment, vehicles, and land. Know what you have, where it is, and what it costs you.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
    title: 'Inventory & Purchasing',
    description: 'Track feed, supplies, and consumables. Automatic reorder alerts. Generate purchase orders when stock runs low.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    title: 'Double-Entry Accounting',
    description: 'Real farm accounting. Every event creates balanced journal entries. Track costs per animal, per field, per activity.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'Reports & Analytics',
    description: 'P&L statements, balance sheets, and custom reports. See your true profitability at any time.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    title: 'Multi-Site Management',
    description: 'Manage multiple properties from one dashboard. Consolidated or per-site reporting. Cross-site transfers.',
  },
];

const useCases = [
  {
    title: 'Cattle Ranchers',
    description: 'Track head counts, feeding costs, vet treatments, and calculate true cost-per-head for better pricing decisions.',
    icon: '🐄',
  },
  {
    title: 'Hobby Farmers',
    description: 'Simple task lists and event logging to stay organized. Start free with up to 5 animals.',
    icon: '🌾',
  },
  {
    title: 'Market Gardens',
    description: 'Track planting, harvests, and sales. Know which crops are actually profitable.',
    icon: '🥬',
  },
  {
    title: 'Diversified Operations',
    description: 'Manage livestock, crops, and equipment across multiple sites from one place.',
    icon: '🏡',
  },
];

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-primary-50 via-white to-white py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary-100/40 via-transparent to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
              </span>
              Free for small homesteads
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-gray-900 leading-tight tracking-tight">
              The All-in-One Platform for{' '}
              <span className="text-primary-600">Farm & Ranch Management</span>
            </h1>

            <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
              Events, tasks, inventory, purchasing, and accounting in one connected system.
              Log an activity once. Everything else updates automatically.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup" className="btn-primary btn-lg w-full sm:w-auto text-base px-8">
                Start Free
              </Link>
              <Link to="/features" className="btn-secondary btn-lg w-full sm:w-auto text-base px-8">
                See All Features
              </Link>
            </div>

            <p className="mt-4 text-sm text-gray-500">
              No credit card required. Free for homesteads with up to 5 animals.
            </p>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-16 relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary-200 via-primary-100 to-secondary-100 rounded-2xl blur-2xl opacity-40"></div>
            <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-800 h-8 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="ml-4 text-xs text-gray-400">app.steadstack.com</span>
              </div>
              <div className="aspect-[16/9] bg-gradient-to-br from-gray-50 via-white to-primary-50 p-8 flex items-center justify-center">
                <div className="grid grid-cols-3 gap-6 w-full max-w-4xl">
                  {/* Mini dashboard cards */}
                  <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Active Livestock</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">47</div>
                    <div className="text-xs text-green-600 mt-1">+3 this month</div>
                  </div>
                  <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Tasks Due</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">12</div>
                    <div className="text-xs text-amber-600 mt-1">4 overdue</div>
                  </div>
                  <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">MTD Expenses</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">$2,847</div>
                    <div className="text-xs text-gray-500 mt-1">Feed: $1,420</div>
                  </div>
                  <div className="col-span-2 bg-white rounded-lg shadow-lg border border-gray-100 p-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Recent Events</div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="text-gray-600">Fed cattle herd - 200 lbs grain</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span className="text-gray-600">Vaccinated goat #23</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-gray-600">Equipment maintenance - Tractor</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow-lg border border-gray-100 p-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Low Stock</div>
                    <div className="mt-2 space-y-1">
                      <div className="text-sm text-red-600">Grain: 2 bags</div>
                      <div className="text-sm text-amber-600">Hay: 8 bales</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900">
              Everything Connected, Nothing Duplicated
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              One system that handles operations, inventory, and finances together.
              Log once, update everywhere.
            </p>
          </div>

          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all duration-200 bg-white"
              >
                <div className="w-12 h-12 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-colors">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link to="/features" className="btn-secondary">
              Explore All Features
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900">
              One Event, Everything Updates
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Stop duplicating data entry. Log an activity and watch the magic happen.
            </p>
          </div>

          <div className="mt-16 relative">
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-200 via-primary-400 to-primary-200 -translate-y-1/2"></div>
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: '1', title: 'Log Event', desc: '"Feed goats 50 lbs grain"', color: 'bg-primary-600' },
                { step: '2', title: 'Inventory Updates', desc: 'Grain stock decreases by 50 lbs', color: 'bg-primary-500' },
                { step: '3', title: 'Costs Tracked', desc: 'Goat cost basis increases', color: 'bg-primary-500' },
                { step: '4', title: 'Reports Ready', desc: 'P&L reflects the expense', color: 'bg-primary-600' },
              ].map((item, index) => (
                <div key={index} className="relative text-center">
                  <div className={`relative z-10 w-14 h-14 rounded-full ${item.color} text-white font-bold text-xl flex items-center justify-center mx-auto shadow-lg`}>
                    {item.step}
                  </div>
                  <h3 className="mt-4 font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="section bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900">
              Built for Real Farm Work
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              From small homesteads to multi-site operations, SteadStack scales with you.
            </p>
          </div>

          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase, index) => (
              <div
                key={index}
                className="p-6 rounded-xl bg-gray-50 border border-gray-100 hover:border-primary-200 transition-colors"
              >
                <div className="text-4xl mb-4">{useCase.icon}</div>
                <h3 className="font-semibold text-gray-900">{useCase.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="section bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900">
              Simple Pricing, No Surprises
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Free for tiny operations. One affordable plan for everything else.
            </p>
          </div>

          <div className="mt-16 grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 rounded-2xl bg-white border border-gray-200 text-center">
              <h3 className="text-xl font-semibold text-gray-900">Free</h3>
              <p className="mt-2 text-sm text-gray-500">For tiny homesteads</p>
              <div className="mt-6">
                <span className="text-5xl font-bold text-gray-900">$0</span>
                <span className="text-gray-500">/forever</span>
              </div>
              <ul className="mt-8 space-y-3 text-left">
                {['1 site', 'Up to 5 animals', 'Basic event tracking', 'Task lists', 'Email support'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-600">
                    <svg className="w-5 h-5 text-primary-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="mt-8 block w-full btn-secondary py-3">
                Get Started Free
              </Link>
            </div>

            {/* Full Access Plan */}
            <div className="relative p-8 rounded-2xl bg-primary-600 text-white text-center ring-4 ring-primary-200 scale-105">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="inline-block bg-secondary-400 text-secondary-900 text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wide">
                  Most Popular
                </span>
              </div>
              <h3 className="text-xl font-semibold text-white">Full Access</h3>
              <p className="mt-2 text-sm text-primary-100">Everything SteadStack offers</p>
              <div className="mt-6">
                <span className="text-5xl font-bold text-white">$34.99</span>
                <span className="text-primary-100">/month</span>
              </div>
              <ul className="mt-8 space-y-3 text-left">
                {['Unlimited sites', 'Unlimited animals', 'Full inventory & purchasing', 'Double-entry accounting', 'Reports & analytics', 'Priority support'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white">
                    <svg className="w-5 h-5 text-primary-200 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="mt-8 block w-full bg-white text-primary-700 hover:bg-gray-100 font-medium py-3 rounded-lg transition-colors">
                Start Free, Upgrade Later
              </Link>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link to="/pricing" className="text-primary-600 hover:text-primary-700 font-medium">
              Compare plans in detail →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white">
            Stop Managing Your Farm in Spreadsheets
          </h2>
          <p className="mt-4 text-xl text-primary-100">
            Join farmers and ranchers who finally have their operations, inventory, and finances in one place.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup" className="btn bg-white text-primary-700 hover:bg-gray-100 btn-lg px-8">
              Start Free Today
            </Link>
            <Link to="/features" className="btn bg-primary-500 text-white hover:bg-primary-400 btn-lg px-8">
              See How It Works
            </Link>
          </div>
          <p className="mt-6 text-sm text-primary-200">
            Free for homesteads with up to 5 animals. No credit card required.
          </p>
        </div>
      </section>
    </div>
  );
}
