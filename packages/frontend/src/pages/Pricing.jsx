import { useState } from 'react';
import { Link } from 'react-router-dom';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small hobby farms',
    price: { monthly: 29, annual: 290 },
    features: [
      'Up to 1 site',
      'Up to 50 animals',
      'Basic event tracking',
      'Simple inventory management',
      'Monthly reports',
      'Email support',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'For growing operations',
    price: { monthly: 79, annual: 790 },
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
    cta: 'Start Free Trial',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large commercial operations',
    price: { monthly: 199, annual: 1990 },
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
    cta: 'Contact Sales',
    highlighted: false,
  },
];

const faqs = [
  {
    question: 'Can I try SteadStack before committing?',
    answer: 'Yes! All plans come with a free 14-day trial. No credit card required. You can explore all features and see how SteadStack fits your operation.',
  },
  {
    question: 'What happens if I exceed my plan limits?',
    answer: "We'll notify you when you're approaching your limits. You can upgrade at any time, and we prorate the difference. We never cut off your access to your data.",
  },
  {
    question: 'Can I switch plans later?',
    answer: 'Absolutely. Upgrade or downgrade at any time. When upgrading, you pay the prorated difference. When downgrading, the change takes effect at your next billing cycle.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes. We use industry-standard encryption, regular backups, and secure cloud infrastructure. Your farm data is private and protected.',
  },
  {
    question: 'Do you offer discounts for annual billing?',
    answer: 'Yes! Annual plans save you roughly 17% compared to monthly billing. Pay for 10 months, get 12.',
  },
  {
    question: 'What kind of support do you offer?',
    answer: 'All plans include email support. Professional plans get priority response times. Enterprise plans include a dedicated account manager and phone support.',
  },
];

const featureComparison = [
  { feature: 'Sites', starter: '1', professional: 'Up to 5', enterprise: 'Unlimited' },
  { feature: 'Animals', starter: '50', professional: '500', enterprise: 'Unlimited' },
  { feature: 'Users', starter: '2', professional: '10', enterprise: 'Unlimited' },
  { feature: 'Event Tracking', starter: 'Basic', professional: 'Advanced', enterprise: 'Full + Automation' },
  { feature: 'Inventory Management', starter: 'Basic', professional: 'Full', enterprise: 'Full + Forecasting' },
  { feature: 'Reorder Alerts', starter: false, professional: true, enterprise: true },
  { feature: 'Accounting', starter: false, professional: 'Basic', enterprise: 'Full Double-Entry' },
  { feature: 'Reports', starter: 'Monthly', professional: 'Weekly', enterprise: 'Real-time' },
  { feature: 'API Access', starter: false, professional: false, enterprise: true },
  { feature: 'Custom Integrations', starter: false, professional: false, enterprise: true },
  { feature: 'Support', starter: 'Email', professional: 'Priority Email', enterprise: 'Dedicated + Phone' },
];

export default function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState('monthly');

  return (
    <div>
      {/* Header */}
      <section className="bg-gradient-to-b from-primary-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-gray-900">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the plan that fits your operation. All plans include a free 14-day trial.
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 inline-flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingPeriod === 'annual'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annual <span className="text-primary-600 ml-1">Save 17%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 -mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-8 ${
                  plan.highlighted
                    ? 'bg-primary-600 text-white ring-4 ring-primary-200 scale-105'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-block bg-secondary-400 text-secondary-900 text-xs font-semibold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <h3 className={`text-xl font-semibold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                  {plan.name}
                </h3>
                <p className={`mt-2 text-sm ${plan.highlighted ? 'text-primary-100' : 'text-gray-500'}`}>
                  {plan.description}
                </p>

                <div className="mt-6">
                  <span className={`text-5xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                    ${billingPeriod === 'monthly' ? plan.price.monthly : Math.round(plan.price.annual / 12)}
                  </span>
                  <span className={plan.highlighted ? 'text-primary-100' : 'text-gray-500'}>/month</span>
                  {billingPeriod === 'annual' && (
                    <p className={`mt-1 text-sm ${plan.highlighted ? 'text-primary-100' : 'text-gray-500'}`}>
                      Billed annually (${plan.price.annual}/year)
                    </p>
                  )}
                </div>

                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <svg
                        className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                          plan.highlighted ? 'text-primary-200' : 'text-primary-500'
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span className={plan.highlighted ? 'text-white' : 'text-gray-600'}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={plan.cta === 'Contact Sales' ? '/contact?source=pricing' : '/signup'}
                  className={`mt-8 block w-full text-center py-3 px-4 rounded-lg font-medium transition-colors ${
                    plan.highlighted
                      ? 'bg-white text-primary-700 hover:bg-gray-100'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="section bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 text-center mb-12">
            Compare Plans
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-4 text-left text-sm font-semibold text-gray-900">Feature</th>
                  <th className="py-4 text-center text-sm font-semibold text-gray-900">Starter</th>
                  <th className="py-4 text-center text-sm font-semibold text-primary-600">Professional</th>
                  <th className="py-4 text-center text-sm font-semibold text-gray-900">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {featureComparison.map((row, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-4 text-sm text-gray-900">{row.feature}</td>
                    {['starter', 'professional', 'enterprise'].map((plan) => (
                      <td key={plan} className="py-4 text-center">
                        {typeof row[plan] === 'boolean' ? (
                          row[plan] ? (
                            <svg className="w-5 h-5 text-primary-500 mx-auto" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )
                        ) : (
                          <span className="text-sm text-gray-600">{row[plan]}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="section bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="border-b border-gray-100 pb-6">
                <h3 className="text-lg font-semibold text-gray-900">{faq.question}</h3>
                <p className="mt-2 text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-display font-bold text-white">
            Ready to get started?
          </h2>
          <p className="mt-4 text-xl text-primary-100">
            Try SteadStack free for 14 days. No credit card required.
          </p>
          <div className="mt-8">
            <Link to="/signup" className="btn bg-white text-primary-700 hover:bg-gray-100 btn-lg">
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
