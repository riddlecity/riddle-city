// app/contact/page.tsx
import Link from 'next/link';

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-neutral-900 text-white py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Link 
            href="/" 
            className="inline-block mb-6 text-purple-400 hover:text-purple-300 transition-colors"
          >
            ← Back to RiddleCity
          </Link>
          <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-neutral-400">Get in touch with the RiddleCity team</p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Get In Touch</h2>
              <div className="space-y-4">
                <div className="bg-neutral-800 rounded-lg p-6">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    📧 Email
                  </h3>
                  <p className="text-neutral-300">
                    <a 
                      href="mailto:hello@riddlecity.co.uk" 
                      className="text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      hello@riddlecity.co.uk
                    </a>
                  </p>
                  <p className="text-sm text-neutral-400 mt-2">
                    We typically respond within 24 hours
                  </p>
                </div>

                <div className="bg-neutral-800 rounded-lg p-6">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    📍 Location
                  </h3>
                  <p className="text-neutral-300">
                    Based in Barnsley, South Yorkshire<br />
                    United Kingdom
                  </p>
                </div>

                <div className="bg-neutral-800 rounded-lg p-6">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    🕒 Response Times
                  </h3>
                  <ul className="text-neutral-300 space-y-1 text-sm">
                    <li><strong>General inquiries:</strong> 24-48 hours</li>
                    <li><strong>Booking support:</strong> Within 24 hours</li>
                    <li><strong>Technical issues:</strong> Same day during business hours</li>
                    <li><strong>Refund requests:</strong> 2-3 business days</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
              <div className="space-y-4">
                <details className="bg-neutral-800 rounded-lg p-4">
                  <summary className="font-semibold cursor-pointer hover:text-purple-400 transition-colors">
                    How do I get a refund?
                  </summary>
                  <p className="text-neutral-300 mt-2 text-sm">
                    Email us at hello@riddlecity.co.uk with your booking details. Refunds are available up to 24 hours before your planned start time, or if technical issues prevent game completion.
                  </p>
                </details>

                <details className="bg-neutral-800 rounded-lg p-4">
                  <summary className="font-semibold cursor-pointer hover:text-purple-400 transition-colors">
                    I'm having technical difficulties during my game
                  </summary>
                  <p className="text-neutral-300 mt-2 text-sm">
                    Contact us immediately at hello@riddlecity.co.uk with your team name and the issue you're experiencing. We'll help resolve it quickly or provide a full refund if needed.
                  </p>
                </details>

                <details className="bg-neutral-800 rounded-lg p-4">
                  <summary className="font-semibold cursor-pointer hover:text-purple-400 transition-colors">
                    Can you create a custom game for our company/event?
                  </summary>
                  <p className="text-neutral-300 mt-2 text-sm">
                    Yes! We offer custom riddle experiences for corporate events, team building, and special occasions. Email us with your requirements and we'll create something unique for your group.
                  </p>
                </details>

                <details className="bg-neutral-800 rounded-lg p-4">
                  <summary className="font-semibold cursor-pointer hover:text-purple-400 transition-colors">
                    Will you expand to other cities?
                  </summary>
                  <p className="text-neutral-300 mt-2 text-sm">
                    Absolutely! We're planning to expand to Sheffield, Leeds, and other UK cities. Email us to suggest your city or get notified when we launch in new locations.
                  </p>
                </details>
              </div>
            </section>
          </div>

          {/* Contact Form */}
          <div>
            <section>
              <h2 className="text-2xl font-semibold mb-4">Send Us a Message</h2>
              <div className="bg-neutral-800 rounded-lg p-6">
                <form className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Your name"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="your@email.com"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium mb-2">
                      Subject
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select a topic...</option>
                      <option value="booking">Booking Support</option>
                      <option value="technical">Technical Issue</option>
                      <option value="refund">Refund Request</option>
                      <option value="custom">Custom Game Inquiry</option>
                      <option value="feedback">Feedback</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      className="w-full px-4 py-3 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      placeholder="Tell us how we can help..."
                      required
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Send Message
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-neutral-400 text-sm">
                    Or email us directly at{' '}
                    <a 
                      href="mailto:hello@riddlecity.co.uk" 
                      className="text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      hello@riddlecity.co.uk
                    </a>
                  </p>
                </div>
              </div>
            </section>

            {/* Business Info */}
            <section className="mt-8">
              <h2 className="text-2xl font-semibold mb-4">Business Information</h2>
              <div className="bg-neutral-800 rounded-lg p-6 space-y-3">
                <div>
                  <h3 className="font-semibold text-sm text-neutral-400">Business Name</h3>
                  <p className="text-white">RiddleCity</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-neutral-400">Location</h3>
                  <p className="text-white">Barnsley, South Yorkshire, UK</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-neutral-400">Services</h3>
                  <p className="text-white">Location-based puzzle adventures and team experiences</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}