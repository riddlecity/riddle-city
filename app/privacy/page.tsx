// app/privacy/page.tsx
import Link from 'next/link';

export default function PrivacyPolicyPage() {
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
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-neutral-400">Last updated: January 2025</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            <div className="text-neutral-300 space-y-4">
              <p>When you use RiddleCity, we collect the following information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Team Information:</strong> Team names, player count, and email addresses for game invitations</li>
                <li><strong>Payment Data:</strong> Payment information is securely processed by Stripe - we never store card details</li>
                <li><strong>Game Data:</strong> Your progress through riddles, completion times, and team performance</li>
                <li><strong>Technical Data:</strong> IP address, browser type, and usage analytics to improve our service</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <div className="text-neutral-300 space-y-4">
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide and operate the RiddleCity game experience</li>
                <li>Send game invitations and confirmations to team members</li>
                <li>Process payments securely through our payment provider (Stripe)</li>
                <li>Display leaderboards and track team progress</li>
                <li>Improve our service and develop new features</li>
                <li>Communicate important updates about your booking</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Information Sharing</h2>
            <div className="text-neutral-300 space-y-4">
              <p>We do not sell, trade, or rent your personal information. We only share information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>With your team members (names and progress within your game)</li>
                <li>With Stripe for secure payment processing</li>
                <li>When required by law or legal process</li>
                <li>To protect our rights, property, or safety</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Storage and Security</h2>
            <div className="text-neutral-300 space-y-4">
              <p>Your data is stored securely using industry-standard practices:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>All data is encrypted in transit and at rest</li>
                <li>We use Supabase for secure database hosting</li>
                <li>Game data is automatically deleted after 48 hours of completion</li>
                <li>Payment information is handled exclusively by Stripe (PCI DSS compliant)</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Your Rights (GDPR)</h2>
            <div className="text-neutral-300 space-y-4">
              <p>Under GDPR, you have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Rectification:</strong> Correct inaccurate personal data</li>
                <li><strong>Erasure:</strong> Request deletion of your personal data</li>
                <li><strong>Portability:</strong> Receive your data in a structured format</li>
                <li><strong>Withdrawal:</strong> Withdraw consent at any time</li>
              </ul>
              <p>To exercise these rights, contact us at hello@riddlecity.co.uk</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Cookies</h2>
            <div className="text-neutral-300 space-y-4">
              <p>We use essential cookies to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Maintain your game session and team membership</li>
                <li>Remember your progress through riddles</li>
                <li>Ensure proper functionality of payment processing</li>
              </ul>
              <p>These cookies are essential for the service to work and are automatically deleted when your game expires.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Third-Party Services</h2>
            <div className="text-neutral-300 space-y-4">
              <p>We use the following third-party services:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Stripe:</strong> Payment processing (see Stripe's privacy policy)</li>
                <li><strong>Supabase:</strong> Secure database hosting</li>
                <li><strong>Vercel:</strong> Website hosting and performance</li>
                <li><strong>Zoho Mail:</strong> Email delivery for game invitations</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
            <div className="text-neutral-300 space-y-4">
              <p>If you have any questions about this Privacy Policy or wish to exercise your rights, please contact us:</p>
              <div className="bg-neutral-800 rounded-lg p-4 mt-4">
                <p><strong>Email:</strong> hello@riddlecity.co.uk</p>
                <p><strong>Address:</strong> RiddleCity, Barnsley, South Yorkshire, United Kingdom</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Changes to This Policy</h2>
            <div className="text-neutral-300 space-y-4">
              <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}