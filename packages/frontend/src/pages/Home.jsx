import { Link } from 'react-router-dom';

const features = [
  {
    title: 'Events that post to inventory + accounting',
    description: 'Log it once. Stock levels, cost basis, and the ledger update automatically.',
  },
  {
    title: 'Land → Structures → Areas → Bins',
    description: 'Map sites and tracts, then organize every barn, room, and bin with clarity.',
  },
  {
    title: 'Tasks, runlists, and recurring work',
    description: 'Daily checklists with drag-and-drop order, priorities, and inventory allocations.',
  },
  {
    title: 'Purchasing pipeline',
    description: 'Requisitions, POs, receipts, bills, and payments in one clean flow.',
  },
  {
    title: 'Double-entry accounting',
    description: 'Built-in chart of accounts, A/R, A/P, reconciliation, and reporting.',
  },
  {
    title: 'Contacts + labor rates',
    description: 'Unified contact system for employees, vendors, contractors, and customers.',
  },
];

const opsFlow = [
  {
    title: 'Plan the work',
    description: 'Templates and runlists keep crews aligned and on schedule.',
  },
  {
    title: 'Record the event',
    description: 'Feedings, treatments, harvests, transfers — all captured once.',
  },
  {
    title: 'Inventory updates',
    description: 'Weighted-average costs and per-site balances update automatically.',
  },
  {
    title: 'Books stay current',
    description: 'Every event posts to double-entry accounting with audit trails.',
  },
];

const plansPreview = [
  {
    name: 'Free',
    monthly: 0,
    description: 'Tiny homesteads starting out',
    highlight: false,
    bullets: ['1 site, 1 user', '10 animals', '25 tasks + 2 runlists', 'Basic event tracking'],
  },
  {
    name: 'Homestead',
    monthly: 19,
    description: 'Small farms needing control',
    highlight: true,
    badge: 'Most Popular',
    bullets: ['2 sites, 3 users', '100 animals', 'Inventory + purchasing', 'Full accounting'],
  },
  {
    name: 'Ranch Growth',
    monthly: 99,
    description: 'Multi-crew operations',
    highlight: false,
    bullets: ['5 sites, 12 users', '2,000 animals', 'Advanced reporting', 'Priority support'],
  },
  {
    name: 'Ranch Pro',
    monthly: 249,
    description: 'High-scale ranches',
    highlight: false,
    bullets: ['Unlimited sites', '10,000 animals', 'Onboarding support', 'Expanded storage'],
  },
];

const formatPrice = (value) => {
  if (value === 0) return '0';
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
};

export default function Home() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-earth-50 via-white to-primary-50">
        <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-secondary-200 blur-3xl opacity-60" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-primary-200 blur-3xl opacity-50" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 relative">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-earth-100 px-4 py-2 text-sm font-semibold text-earth-700">
                Field-ready farm management
              </div>
              <h1 className="mt-6 text-4xl md:text-5xl lg:text-6xl font-display font-bold text-gray-900 leading-tight">
                The operating system for modern farms and ranches
              </h1>
              <p className="mt-6 text-lg text-gray-600 max-w-xl">
                SteadStack connects tasks, inventory, purchasing, and accounting into one living system. Log the work once and stay
                audit-ready without spreadsheets.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link to="/signup" className="btn-primary btn-lg px-8">
                  Start Free
                </Link>
                <Link to="/pricing" className="btn-secondary btn-lg px-8">
                  View Pricing
                </Link>
              </div>
              <p className="mt-4 text-sm text-gray-500">Free for tiny homesteads. Annual billing saves 15%.</p>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary-200 via-white to-secondary-200 blur-2xl opacity-70" />
              <div className="relative rounded-3xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div className="text-sm font-semibold text-gray-700">SteadStack Fieldboard</div>
                  <div className="text-xs text-gray-500">Live Operations</div>
                </div>
                <div className="p-6 space-y-4 bg-gradient-to-br from-white via-emerald-50 to-earth-50">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
                      <div className="text-xs uppercase tracking-wide text-gray-400">Active Tasks</div>
                      <div className="mt-2 text-2xl font-bold text-gray-900">14</div>
                      <div className="mt-1 text-xs text-amber-600">3 overdue</div>
                    </div>
                    <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
                      <div className="text-xs uppercase tracking-wide text-gray-400">Livestock</div>
                      <div className="mt-2 text-2xl font-bold text-gray-900">312</div>
                      <div className="mt-1 text-xs text-green-600">+8 this month</div>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
                    <div className="text-xs uppercase tracking-wide text-gray-400">Recent Events</div>
                    <div className="mt-3 space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-500" />Feed herd - 280 lbs grain</div>
                      <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-blue-500" />Vaccinated pen 4</div>
                      <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" />Fuel delivery posted</div>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-gray-900 text-white p-4 shadow-sm">
                    <div className="text-xs uppercase tracking-wide text-gray-400">MTD Net</div>
                    <div className="mt-2 text-2xl font-bold">$18,420</div>
                    <div className="mt-1 text-xs text-green-400">+11% vs last month</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ops Flow */}
      <section className="section bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900">One workflow. Everything stays synced.</h2>
            <p className="mt-4 text-lg text-gray-600">Operations, inventory, and accounting update together without duplicate entry.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {opsFlow.map((step, index) => (
              <div key={step.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
                <div className="text-xs font-semibold text-earth-600">Step 0{index + 1}</div>
                <h3 className="mt-3 text-lg font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="section bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900">Everything you need, nothing you don’t</h2>
            <p className="mt-4 text-lg text-gray-600">Purpose-built modules for the way farms actually run.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="section bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900">Plans for every size of operation</h2>
            <p className="mt-4 text-lg text-gray-600">Pricing below shows annual billing with the lower monthly equivalent.</p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-4">
            {plansPreview.map((plan) => {
              const annualMonthly = plan.monthly * 0.85;
              return (
                <div
                  key={plan.name}
                  className={`relative rounded-3xl border p-6 ${
                    plan.highlight ? 'border-primary-200 bg-primary-600 text-white shadow-lg' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 left-6 rounded-full bg-secondary-400 px-3 py-1 text-xs font-bold uppercase text-secondary-900">
                      {plan.badge}
                    </span>
                  )}
                  <h3 className={`text-lg font-semibold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                  <p className={`mt-1 text-sm ${plan.highlight ? 'text-primary-100' : 'text-gray-600'}`}>{plan.description}</p>
                  <div className="mt-4">
                    {plan.monthly === 0 ? (
                      <div className={`text-3xl font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>Free</div>
                    ) : (
                      <div className="flex items-end gap-2">
                        <span className={`text-3xl font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                          ${formatPrice(annualMonthly)}
                        </span>
                        <span className={plan.highlight ? 'text-primary-100' : 'text-gray-500'}>/mo</span>
                      </div>
                    )}
                    {plan.monthly > 0 && (
                      <p className={`mt-1 text-xs ${plan.highlight ? 'text-primary-100' : 'text-gray-500'}`}>Billed annually</p>
                    )}
                  </div>
                  <ul className={`mt-4 space-y-2 text-sm ${plan.highlight ? 'text-white' : 'text-gray-600'}`}>
                    {plan.bullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="mt-10 text-center">
            <Link to="/pricing" className="btn-secondary btn-lg px-8">
              Compare all plan details
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-primary-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-display font-bold">Ready to put the farm on autopilot?</h2>
          <p className="mt-4 text-lg text-primary-100">
            Start free and upgrade only when the operation is ready.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup" className="btn bg-white text-primary-700 hover:bg-gray-100 btn-lg px-8">
              Start Free
            </Link>
            <Link to="/features" className="btn bg-primary-600 text-white hover:bg-primary-500 btn-lg px-8">
              Explore Features
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
