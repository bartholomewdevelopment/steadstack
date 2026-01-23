import { Link } from 'react-router-dom';

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    title: 'Event Tracking',
    description: 'Log every farm activity as an operational event. Feeding, treatments, harvests, maintenance - all in one place.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
    title: 'Inventory Management',
    description: 'Track feed, supplies, and equipment. Automatic reorder alerts when stock runs low. Never run out of essentials.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    title: 'Financial Tracking',
    description: 'Double-entry accounting built for agriculture. Track costs per animal, per field, per activity. See your true profitability.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    title: 'Multi-Site Support',
    description: 'Manage multiple properties from one dashboard. Consolidated reporting across all your sites, or drill down to each.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'Reports & Analytics',
    description: 'Generate P&L statements, balance sheets, and custom reports. Know exactly where your money goes.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: 'Audit Trail',
    description: 'Every entry links back to its source event. Full traceability for compliance, taxes, and peace of mind.',
  },
];

const testimonials = [
  {
    quote: "SteadStack transformed how we manage our cattle operation. We finally know our true cost per head.",
    author: "Sarah Mitchell",
    role: "Ranch Owner, TX",
  },
  {
    quote: "The inventory alerts alone have saved us thousands. No more emergency feed runs at premium prices.",
    author: "James Rodriguez",
    role: "Dairy Farmer, WI",
  },
  {
    quote: "Being able to track multiple properties in one place made expansion so much easier to manage.",
    author: "Emily Chen",
    role: "Diversified Farm, OR",
  },
];

const pricingPreview = [
  { name: 'Starter', price: 29, description: 'For hobby farms', highlight: false },
  { name: 'Professional', price: 79, description: 'For growing operations', highlight: true },
  { name: 'Enterprise', price: 199, description: 'For large commercial ops', highlight: false },
];

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-primary-50 to-white py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-gray-900 leading-tight">
              Farm Management{' '}
              <span className="text-primary-600">Made Simple</span>
            </h1>
            <p className="mt-6 text-xl text-gray-600">
              Track operations, inventory, and finances in one unified platform.
              Every activity automatically updates your books. Know your true profitability.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup" className="btn-primary btn-lg w-full sm:w-auto">
                Start Free 14-Day Trial
              </Link>
              <Link to="/features" className="btn-secondary btn-lg w-full sm:w-auto">
                See How It Works
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              No credit card required. Cancel anytime.
            </p>
          </div>

          {/* Hero Image Placeholder */}
          <div className="mt-16 relative">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-100 h-8 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="aspect-[16/9] bg-gradient-to-br from-primary-100 via-white to-secondary-50 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-100 text-primary-600 mb-4">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                    </svg>
                  </div>
                  <p className="text-lg text-gray-600">Dashboard Preview</p>
                  <p className="text-sm text-gray-400 mt-2">Your farm at a glance</p>
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
              Everything You Need to Run Your Operation
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              From daily chores to annual reports, SteadStack keeps it all connected.
            </p>
          </div>

          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-xl border border-gray-200 hover:border-primary-200 hover:shadow-lg transition-all duration-200"
              >
                <div className="w-12 h-12 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
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
              View All Features
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
              Log an activity once. Inventory, accounting, and reports update automatically.
            </p>
          </div>

          <div className="mt-16 relative">
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-primary-200 -translate-y-1/2"></div>
            <div className="grid md:grid-cols-4 gap-8">
              {[
                { step: '1', title: 'Log Event', desc: '"Feed goats 50 lbs grain"' },
                { step: '2', title: 'Inventory Updates', desc: 'Grain stock decreases by 50 lbs' },
                { step: '3', title: 'Costs Tracked', desc: 'Goat cost basis increases' },
                { step: '4', title: 'Reports Ready', desc: 'P&L and Balance Sheet current' },
              ].map((item, index) => (
                <div key={index} className="relative text-center">
                  <div className="relative z-10 w-12 h-12 rounded-full bg-primary-600 text-white font-bold text-lg flex items-center justify-center mx-auto">
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

      {/* Testimonials Section */}
      <section className="section bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900">
              Trusted by Farmers & Ranchers
            </h2>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-6 rounded-xl bg-gray-50 border border-gray-100"
              >
                <svg
                  className="w-8 h-8 text-primary-300"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="mt-4 text-gray-700">{testimonial.quote}</p>
                <div className="mt-6">
                  <p className="font-semibold text-gray-900">{testimonial.author}</p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
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
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Plans that grow with your operation. Start free, upgrade when ready.
            </p>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {pricingPreview.map((plan, index) => (
              <div
                key={index}
                className={`p-6 rounded-xl text-center ${
                  plan.highlight
                    ? 'bg-primary-600 text-white ring-4 ring-primary-200'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <h3 className={`text-lg font-semibold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                  {plan.name}
                </h3>
                <div className="mt-4">
                  <span className={`text-4xl font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                    ${plan.price}
                  </span>
                  <span className={plan.highlight ? 'text-primary-100' : 'text-gray-500'}>/month</span>
                </div>
                <p className={`mt-2 text-sm ${plan.highlight ? 'text-primary-100' : 'text-gray-500'}`}>
                  {plan.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link to="/pricing" className="btn-secondary">
              Compare All Plans
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white">
            Ready to Take Control of Your Operation?
          </h2>
          <p className="mt-4 text-xl text-primary-100">
            Join hundreds of farmers and ranchers who trust SteadStack.
          </p>
          <div className="mt-10">
            <Link to="/signup" className="btn bg-white text-primary-700 hover:bg-gray-100 btn-lg">
              Start Your Free Trial
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
