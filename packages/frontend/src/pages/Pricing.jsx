import { Link } from 'react-router-dom';

const plans = [
  {
    id: 'starter',
    name: 'Free',
    description: 'For very small homesteads',
    price: 0,
    features: [
      'Up to 1 site',
      'Up to 5 head of livestock',
      'Up to 10 tasks total',
      'Up to 2 task lists',
      'Basic event tracking',
      'No inventory or purchasing',
      'Email support',
    ],
    cta: 'Get Started Free',
    highlighted: false,
  },
  {
    id: 'professional',
    name: 'Full Access',
    description: 'Everything SteadStack offers',
    price: 34.99,
    features: [
      'Unlimited sites',
      'Unlimited livestock tracking',
      'Unlimited tasks and lists',
      'Full inventory and purchasing',
      'Full double-entry accounting',
      'Reports and analytics',
      'Priority email support',
    ],
    cta: 'Upgrade to Full Access',
    highlighted: true,
    badge: 'Most Popular',
  },
];

const faqs = [
  {
    question: 'Is there a free plan?',
    answer: 'Yes. Very small homesteads can use the Free plan with limited livestock, tasks, and lists.',
  },
  {
    question: 'What happens if I exceed my plan limits?',
    answer: "We'll let you know when you're close to the Free plan limits. You can upgrade to Full Access at any time.",
  },
  {
    question: 'Can I switch plans later?',
    answer: 'Absolutely. Upgrade from Free to Full Access at any time.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes. We use industry-standard encryption, regular backups, and secure cloud infrastructure. Your farm data is private and protected.',
  },
  {
    question: 'What kind of support do you offer?',
    answer: 'All plans include email support. Full Access gets priority response times.',
  },
];

const featureComparison = [
  { feature: 'Sites', starter: '1', professional: 'Unlimited' },
  { feature: 'Livestock (heads)', starter: 'Up to 5', professional: 'Unlimited' },
  { feature: 'Tasks', starter: 'Up to 10 total', professional: 'Unlimited' },
  { feature: 'Task Lists', starter: 'Up to 2', professional: 'Unlimited' },
  { feature: 'Event Tracking', starter: 'Basic', professional: 'Full' },
  { feature: 'Inventory & Purchasing', starter: false, professional: true },
  { feature: 'Accounting', starter: false, professional: 'Full Double-Entry' },
  { feature: 'Reports', starter: 'Basic', professional: 'Full Analytics' },
  { feature: 'Support', starter: 'Email', professional: 'Priority Email' },
];

export default function Pricing() {
  return (
    <div>
      {/* Header */}
      <section className="bg-gradient-to-b from-primary-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-gray-900">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
            Start free, upgrade to Full Access when you're ready.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 -mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
                    {plan.price === 0 ? 'Free' : `$${plan.price.toFixed(2)}`}
                  </span>
                  {plan.price > 0 && (
                    <span className={plan.highlighted ? 'text-primary-100' : 'text-gray-500'}>/month</span>
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
                  to="/signup"
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
                  <th className="py-4 text-center text-sm font-semibold text-gray-900">Free</th>
                  <th className="py-4 text-center text-sm font-semibold text-primary-600">Full Access</th>
                </tr>
              </thead>
              <tbody>
                {featureComparison.map((row, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-4 text-sm text-gray-900">{row.feature}</td>
                    {['starter', 'professional'].map((plan) => (
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
            Start on the Free plan and upgrade anytime.
          </p>
          <div className="mt-8">
            <Link to="/signup" className="btn bg-white text-primary-700 hover:bg-gray-100 btn-lg">
              Start Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
