import { Link } from 'react-router-dom';

const values = [
  {
    title: 'Built for Agriculture',
    description: 'We understand that farm software needs to work differently. Our team includes people who\'ve actually worked on farms and ranches.',
  },
  {
    title: 'Simplicity First',
    description: 'Powerful doesn\'t mean complicated. We obsess over making complex operations feel simple and intuitive.',
  },
  {
    title: 'Data Ownership',
    description: 'Your data is yours. Export everything, anytime. No lock-in, no hostage situations.',
  },
  {
    title: 'Continuous Improvement',
    description: 'We release updates every week. Customer feedback drives our roadmap.',
  },
];

const timeline = [
  {
    year: '2024',
    title: 'The Problem',
    description: 'Frustrated with spreadsheets and disconnected tools, we set out to build something better.',
  },
  {
    year: '2025',
    title: 'Building',
    description: 'Worked with dozens of farmers and ranchers to understand their real needs.',
  },
  {
    year: '2026',
    title: 'Launch',
    description: 'SteadStack goes live, helping operations across the country manage their farms.',
  },
  {
    year: 'Now',
    title: 'Growing',
    description: 'Expanding features based on customer feedback. Building the future of farm management.',
  },
];

export default function About() {
  return (
    <div>
      {/* Header */}
      <section className="bg-gradient-to-b from-primary-50 to-white py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-gray-900">
            Farm Software That Actually Understands Farming
          </h1>
          <p className="mt-6 text-xl text-gray-600">
            We're building the tools we wished existed when we were managing
            agricultural operations ourselves.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="section bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-display font-bold text-gray-900">
                Our Mission
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                To give every farmer and rancher the same operational visibility
                that big agribusiness has, without the complexity or cost.
              </p>
              <p className="mt-4 text-gray-600">
                We believe that when you understand your true costs and can trace
                every dollar back to an activity, you make better decisions.
                Better decisions mean more profitable, sustainable operations.
              </p>
            </div>
            <div className="bg-gradient-to-br from-primary-100 to-secondary-100 rounded-2xl aspect-square flex items-center justify-center">
              <div className="text-center p-8">
                <div className="text-6xl font-bold text-primary-600">$</div>
                <p className="mt-4 text-gray-700 font-medium">
                  Know your true cost per head, per acre, per activity
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-display font-bold text-gray-900 text-center mb-12">
            What We Believe
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <div key={index} className="bg-white rounded-xl p-8 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">{value.title}</h3>
                <p className="mt-3 text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-display font-bold text-gray-900 text-center mb-12">
            Our Journey
          </h2>

          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-primary-200 hidden md:block"></div>

            <div className="space-y-12">
              {timeline.map((item, index) => (
                <div key={index} className="relative flex gap-8">
                  <div className="hidden md:flex flex-shrink-0 w-16 h-16 rounded-full bg-primary-600 text-white items-center justify-center font-bold">
                    {item.year}
                  </div>
                  <div className="flex-1">
                    <span className="md:hidden inline-block px-3 py-1 bg-primary-100 text-primary-700 text-sm font-medium rounded-full mb-2">
                      {item.year}
                    </span>
                    <h3 className="text-xl font-semibold text-gray-900">{item.title}</h3>
                    <p className="mt-2 text-gray-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* The Team Note */}
      <section className="section bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-display font-bold text-gray-900 mb-8">
            Small Team, Big Commitment
          </h2>
          <p className="text-lg text-gray-600">
            We're a small, focused team that talks to customers every day.
            When you email support, you're talking to someone who helped build
            the product. We're not a faceless corporation - we're farmers and
            developers who care about getting this right.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-display font-bold text-white">
            Want to Learn More?
          </h2>
          <p className="mt-4 text-xl text-primary-100">
            We'd love to hear about your operation and show you how SteadStack can help.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/contact" className="btn bg-white text-primary-700 hover:bg-gray-100 btn-lg">
              Get in Touch
            </Link>
            <Link to="/signup" className="btn border-2 border-white text-white hover:bg-primary-700 btn-lg">
              Start Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
