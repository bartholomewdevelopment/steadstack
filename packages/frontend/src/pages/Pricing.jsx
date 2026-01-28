import { useState } from 'react';
import { Link } from 'react-router-dom';
import { InfoTooltip } from '../components/ui/Tooltip';

const ANNUAL_DISCOUNT = 0.15;

const plans = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Tiny homesteads starting out',
    monthly: 0,
    badge: null,
    cta: 'Start Free',
    highlight: false,
    includes: [
      '1 site, 1 user',
      'Up to 10 animals',
      '25 active tasks + 2 runlists',
      'Basic event tracking',
      'No inventory or purchasing',
      'Basic accounting (chart + journal)',
    ],
  },
  {
    id: 'homestead',
    name: 'Homestead',
    tagline: 'Small farms that need control',
    monthly: 19,
    badge: 'Most Popular',
    cta: 'Choose Homestead',
    highlight: true,
    includes: [
      '2 sites, 3 users',
      'Up to 100 animals',
      '250 active tasks + 10 runlists',
      '2,000 events/month',
      'Inventory + purchasing',
      'Full double-entry accounting',
    ],
  },
  {
    id: 'growth',
    name: 'Ranch Growth',
    tagline: 'Multi-crew operations',
    monthly: 99,
    badge: 'Best Value',
    cta: 'Choose Ranch Growth',
    highlight: false,
    includes: [
      '5 sites, 12 users',
      'Up to 2,000 animals',
      '2,000 active tasks + 50 runlists',
      '15,000 events/month',
      'Advanced reporting',
      'Priority support',
    ],
  },
  {
    id: 'pro',
    name: 'Ranch Pro',
    tagline: 'High-scale ranches',
    monthly: 249,
    badge: 'Scale & Support',
    cta: 'Choose Ranch Pro',
    highlight: false,
    includes: [
      'Unlimited sites, 25 users',
      'Up to 10,000 animals',
      '10,000 active tasks + 200 runlists',
      '100,000 events/month',
      'Onboarding + priority support',
      'Expanded storage + data exports',
    ],
  },
];

const comparisonRows = [
  { feature: 'Sites', free: '1', homestead: '2', growth: '5', pro: 'Unlimited' },
  { feature: 'Users', free: '1', homestead: '3', growth: '12', pro: '25' },
  { feature: 'Animals', free: '10', homestead: '100', growth: '2,000', pro: '10,000' },
  { feature: 'Active tasks', free: '25', homestead: '250', growth: '2,000', pro: '10,000' },
  { feature: 'Runlists', free: '2', homestead: '10', growth: '50', pro: '200' },
  { feature: 'Events / month', free: '200', homestead: '2,000', growth: '15,000', pro: '100,000' },
  { feature: 'Inventory items', free: '25', homestead: '150', growth: '1,500', pro: '5,000' },
  { feature: 'Contacts', free: '25', homestead: '150', growth: '1,000', pro: '5,000' },
  { feature: 'Purchasing', free: 'No', homestead: '30 POs/Bills', growth: '300 POs/Bills', pro: '2,000 POs/Bills' },
  { feature: 'Accounting', free: 'Basic only', homestead: 'Full', growth: 'Full + reporting', pro: 'Full + priority' },
  { feature: 'Storage', free: '1 GB', homestead: '5 GB', growth: '25 GB', pro: '100 GB' },
];

const featureTooltips = {
  Sites: 'Physical locations you operate (ranches, farms, or distinct properties).',
  Users: 'People who can log in and work inside the account.',
  Animals: 'Active livestock tracked individually or in groups.',
  'Active tasks': 'Open tasks assigned to your team at any given time.',
  Runlists: 'Reusable checklists that generate daily task runs.',
  'Events / month': 'Operational records that can post to inventory and accounting.',
  'Inventory items': 'Unique SKUs you track across all sites.',
  Contacts: 'Customers, vendors, employees, contractors, and companies.',
  Purchasing: 'Monthly limit for purchase orders and vendor bills.',
  Accounting: 'Depth of accounting tools and automation included.',
  Storage: 'Total file and document storage included.',
};

const includeTooltips = [
  { match: /site/i, text: 'Number of physical locations you can manage under one account.' },
  { match: /user/i, text: 'How many team members can log in with their own credentials.' },
  { match: /animal/i, text: 'Maximum livestock tracked across individuals and groups.' },
  { match: /task/i, text: 'Active task capacity for daily work and recurring schedules.' },
  { match: /runlist/i, text: 'Reusable checklists that auto-generate task runs.' },
  { match: /event/i, text: 'Operational records that trigger inventory and accounting updates.' },
  { match: /inventory/i, text: 'Track stock levels, weighted costs, and reorder alerts by site.' },
  { match: /purchasing/i, text: 'Full procure-to-pay workflow with requisitions, POs, and bills.' },
  { match: /accounting/i, text: 'Double-entry ledger, A/R, A/P, and reconciliation.' },
  { match: /report/i, text: 'Built-in analytics and financial statements.' },
  { match: /support/i, text: 'Priority response times and onboarding help where noted.' },
  { match: /storage/i, text: 'Total document storage included in the plan.' },
  { match: /export/i, text: 'Download reports and data for backups or auditing.' },
];

const getIncludeTooltip = (label) => {
  const match = includeTooltips.find((entry) => entry.match.test(label));
  return match ? match.text : '';
};

const faqs = [
  {
    question: 'How does annual billing work?',
    answer: 'Annual billing shows the lower monthly equivalent and is paid once per year. Monthly billing is 15% higher.',
  },
  {
    question: 'Can I switch plans later?',
    answer: 'Yes. Upgrade or downgrade anytime; changes take effect immediately.',
  },
  {
    question: 'What happens if I exceed my limits?',
    answer: 'We will notify you as you approach limits, and you can upgrade with one click.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes. SteadStack uses encrypted data storage and industry-standard access controls.',
  },
];

const formatPrice = (value) => {
  if (value === 0) return '0';
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
};

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState('annual');

  return (
    <div className="bg-white">
      {/* Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-earth-50 py-16 sm:py-20">
        <div className="absolute -top-24 right-0 h-64 w-64 rounded-full bg-secondary-200 blur-3xl opacity-60" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-primary-200 blur-3xl opacity-50" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <p className="inline-flex items-center gap-2 rounded-full bg-earth-100 px-4 py-2 text-sm font-semibold text-earth-700">
            Pricing built for real farms
          </p>
          <h1 className="mt-6 text-4xl md:text-5xl font-display font-bold text-gray-900">
            Straightforward plans that scale with your operation
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Annual billing is shown by default so the monthly price stays low. Switch to monthly anytime at a 15% higher rate.
          </p>

          <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white shadow-lg border border-gray-100 p-2">
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                billingCycle === 'annual'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annual (save 15%)
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 -mt-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-4">
            {plans.map((plan) => {
              const annualMonthly = Math.round(plan.monthly * (1 - ANNUAL_DISCOUNT));
              const displayMonthly = billingCycle === 'annual' ? annualMonthly : plan.monthly;
              const annualTotal = annualMonthly * 12;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl border p-8 shadow-sm transition-transform duration-300 hover:-translate-y-1 ${
                    plan.highlight
                      ? 'border-primary-200 bg-primary-600 text-white shadow-xl'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-3 left-6 rounded-full bg-secondary-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-secondary-900">
                      {plan.badge}
                    </span>
                  )}

                  <h3 className={`text-xl font-semibold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h3>
                  <p className={`mt-2 text-sm ${plan.highlight ? 'text-primary-100' : 'text-gray-500'}`}>
                    {plan.tagline}
                  </p>

                  <div className="mt-6">
                    {plan.monthly === 0 ? (
                      <div className={`text-4xl font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                        Free
                      </div>
                    ) : (
                      <div className="flex items-end gap-2">
                        <span className={`text-4xl font-bold ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                          ${formatPrice(displayMonthly)}
                        </span>
                        <span className={plan.highlight ? 'text-primary-100' : 'text-gray-500'}>/mo</span>
                      </div>
                    )}
                    {plan.monthly > 0 && (
                      <p className={`mt-2 text-xs ${plan.highlight ? 'text-primary-100' : 'text-gray-500'}`}>
                        {billingCycle === 'annual'
                          ? `Billed annually at $${formatPrice(annualTotal)}/yr`
                          : 'Billed monthly (15% higher than annual rate)'}
                      </p>
                    )}
                  </div>

                  <ul className={`mt-6 space-y-3 text-sm ${plan.highlight ? 'text-white' : 'text-gray-600'}`}>
                    {plan.includes.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className={`mt-1 h-2 w-2 rounded-full ${plan.highlight ? 'bg-secondary-300' : 'bg-primary-500'}`} />
                        <span className="inline-flex items-center gap-2">
                          {item}
                          {getIncludeTooltip(item) && (
                            <InfoTooltip content={getIncludeTooltip(item)} size="sm" position="top" />
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/signup"
                    className={`mt-8 block w-full rounded-full px-4 py-3 text-center text-sm font-semibold transition-colors ${
                      plan.highlight
                        ? 'bg-white text-primary-700 hover:bg-gray-100'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="section bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-display font-bold text-gray-900 text-center">
            Compare plan limits
          </h2>
          <p className="mt-3 text-center text-gray-600">
            Everything is the same core system; limits scale as your operation grows.
          </p>

          <div className="mt-10 overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700">Feature</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700">Free</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-primary-700">Homestead</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700">Ranch Growth</th>
                  <th className="px-4 py-4 text-center text-sm font-semibold text-gray-700">Ranch Pro</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.feature} className="border-t border-gray-100">
                    <td className="px-4 py-4 text-sm text-gray-900">
                      <span className="inline-flex items-center gap-2">
                        {row.feature}
                        {featureTooltips[row.feature] && (
                          <InfoTooltip content={featureTooltips[row.feature]} size="sm" position="top" />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-gray-600">{row.free}</td>
                    <td className="px-4 py-4 text-center text-sm text-gray-700">{row.homestead}</td>
                    <td className="px-4 py-4 text-center text-sm text-gray-600">{row.growth}</td>
                    <td className="px-4 py-4 text-center text-sm text-gray-600">{row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-display font-bold text-gray-900 text-center">Questions, answered</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
                <h3 className="text-lg font-semibold text-gray-900">{faq.question}</h3>
                <p className="mt-2 text-sm text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-primary-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-display font-bold">
            Ready to run the farm on one system?
          </h2>
          <p className="mt-3 text-lg text-primary-100">
            Start free today and move up only when you are ready.
          </p>
          <div className="mt-8">
            <Link to="/signup" className="btn bg-white text-primary-700 hover:bg-gray-100 btn-lg px-10">
              Start Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
