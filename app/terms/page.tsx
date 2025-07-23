// app/terms/page.tsx
import Link from 'next/link';

export default function TermsOfServicePage() {
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
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-neutral-400">Last updated: January 2025</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <div className="text-neutral-300 space-y-4">
              <p>By accessing and using RiddleCity, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
            <div className="text-neutral-300 space-y-4">
              <p>RiddleCity provides puzzle-based adventure experiences in various UK cities. Our service includes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Location-based riddle games accessed via mobile devices</li>
                <li>QR code scanning and manual answer submission</li>
                <li>Team-based multiplayer experiences</li>
                <li>Real-time progress tracking and leaderboards</li>
                <li>Email invitations and game coordination</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Booking and Payment</h2>
            <div className="text-neutral-300 space-y-4">
              <h3 className="text-lg font-semibold">Payment Terms</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Payment is required in advance via Stripe payment processing</li>
                <li>Prices are displayed in GBP including VAT where applicable</li>
                <li>Payment confirmation is sent via email upon successful processing</li>
                <li>We do not store your payment information - all transactions are securely handled by Stripe</li>
              </ul>
              
              <h3 className="text-lg font-semibold mt-6">Game Access</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Games must be completed within 48 hours of payment</li>
                <li>Access links and invitations are sent via email</li>
                <li>Teams can pause and resume games within the 48-hour window</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Refunds and Cancellations</h2>
            <div className="text-neutral-300 space-y-4">
              <h3 className="text-lg font-semibold">Refund Policy</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Before starting:</strong> Full refund available up to 24 hours before your planned start time</li>
                <li><strong>Technical issues:</strong> Full refund if the game cannot be completed due to technical problems on our end</li>
                <li><strong>After starting:</strong> No refunds once the game has been accessed and started</li>
                <li><strong>Weather:</strong> Games are designed to work in most weather conditions - no refunds for weather-related cancellations</li>
              </ul>
              
              <p className="mt-4">To request a refund, email hello@riddlecity.co.uk with your booking details.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. User Responsibilities</h2>
            <div className="text-neutral-300 space-y-4">
              <p>When using RiddleCity, you agree to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Play fairly:</strong> Not share answers or solutions with other teams</li>
                <li><strong>Respect locations:</strong> Be considerate when visiting riddle locations</li>
                <li><strong>Follow local laws:</strong> Comply with all local regulations and property rules</li>
                <li><strong>Use provided materials responsibly:</strong> Not damage QR codes or location markers</li>
                <li><strong>Provide accurate information:</strong> Use valid email addresses for team coordination</li>
                <li><strong>Stay safe:</strong> Be aware of your surroundings and prioritize personal safety</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Prohibited Activities</h2>
            <div className="text-neutral-300 space-y-4">
              <p>You may not:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Attempt to hack, reverse engineer, or exploit the game system</li>
                <li>Share riddle solutions publicly or with competing teams</li>
                <li>Use the service for any illegal or unauthorized purpose</li>
                <li>Interfere with or disrupt the service or servers</li>
                <li>Create multiple accounts to gain unfair advantages</li>
                <li>Harass other players or RiddleCity staff</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Limitation of Liability</h2>
            <div className="text-neutral-300 space-y-4">
              <p>RiddleCity and its operators:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Are not responsible for personal injury or property damage during gameplay</li>
                <li>Do not guarantee continuous, uninterrupted service availability</li>
                <li>Are not liable for third-party actions or property restrictions</li>
                <li>Limit total liability to the amount paid for the game experience</li>
                <li>Are not responsible for weather conditions or external factors affecting gameplay</li>
              </ul>
              
              <p className="mt-4 font-semibold">Players participate at their own risk and are responsible for their own safety.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Intellectual Property</h2>
            <div className="text-neutral-300 space-y-4">
              <p>All content provided by RiddleCity, including but not limited to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Riddle content and puzzles</li>
                <li>Game mechanics and design</li>
                <li>Website design and functionality</li>
                <li>Branding and logos</li>
              </ul>
              <p>Are the intellectual property of RiddleCity and are protected by copyright law. Unauthorized reproduction or distribution is prohibited.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Privacy and Data</h2>
            <div className="text-neutral-300 space-y-4">
              <p>Your privacy is important to us. Please review our <Link href="/privacy" className="text-purple-400 hover:text-purple-300">Privacy Policy</Link> to understand how we collect, use, and protect your information.</p>
              
              <p>Key points:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Game data is automatically deleted 48 hours after completion</li>
                <li>We only collect information necessary to provide the service</li>
                <li>Payment information is securely handled by Stripe</li>
                <li>You have rights under GDPR to access, modify, or delete your data</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Service Modifications</h2>
            <div className="text-neutral-300 space-y-4">
              <p>RiddleCity reserves the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Modify or discontinue the service with reasonable notice</li>
                <li>Update riddle content and game mechanics</li>
                <li>Change pricing with advance notice</li>
                <li>Suspend accounts that violate these terms</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact Information</h2>
            <div className="text-neutral-300 space-y-4">
              <p>For questions about these Terms of Service, please contact us:</p>
              <div className="bg-neutral-800 rounded-lg p-4 mt-4">
                <p><strong>Email:</strong> hello@riddlecity.co.uk</p>
                <p><strong>Address:</strong> RiddleCity, Barnsley, South Yorkshire, United Kingdom</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Governing Law</h2>
            <div className="text-neutral-300 space-y-4">
              <p>These Terms of Service are governed by and construed in accordance with the laws of England and Wales. Any disputes arising from these terms will be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
            <div className="text-neutral-300 space-y-4">
              <p>We reserve the right to modify these terms at any time. Changes will be posted on this page with an updated "Last updated" date. Continued use of the service after changes constitutes acceptance of the new terms.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}