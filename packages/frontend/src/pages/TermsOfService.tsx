import { Navigation } from '../components/Navigation';

export default function TermsOfService() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
            <div className="prose prose-gray max-w-none">
              <p className="text-sm text-gray-500 mb-6">Last Updated: January 7, 2026</p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing and using GetHiredPOC ("Service"), you accept and agree to be bound by the terms
                and provision of this agreement.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">2. Description of Service</h2>
              <p>
                GetHiredPOC is an AI-powered job search platform that helps you find relevant job opportunities,
                track applications, and generate tailored resumes and cover letters.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">3. Free Trial</h2>
              <p>
                New users may receive a 14-day free trial of PRO tier features. The trial period begins when you
                create your account and select the trial option. No payment information is required during the trial.
              </p>
              <p>
                After the 14-day trial period expires, your account will automatically downgrade to the FREE tier
                with usage limits unless you upgrade to a paid PRO subscription.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">4. Subscription Tiers</h2>
              <h3 className="text-xl font-semibold mt-6 mb-3">FREE Tier</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>3 job searches per day</li>
                <li>10 applications per month</li>
                <li>5 resume generations per month</li>
                <li>10 cover letter generations per month</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3">PRO Tier ($39/month)</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Unlimited job searches</li>
                <li>Unlimited applications</li>
                <li>Unlimited resume generations</li>
                <li>Unlimited cover letter generations</li>
                <li>Priority support</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">5. Payment and Billing</h2>
              <p>
                PRO subscriptions are billed monthly at $39 USD. Payment is processed through our payment provider,
                Polar.sh. By subscribing, you authorize us to charge your payment method on a recurring monthly basis.
              </p>
              <p>
                You may cancel your PRO subscription at any time. Cancellations take effect at the end of the current
                billing period. No refunds are provided for partial months.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">6. User Accounts</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials. You agree to
                notify us immediately of any unauthorized use of your account.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">7. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Use the Service for any illegal purpose</li>
                <li>Attempt to gain unauthorized access to the Service</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Share your account with others</li>
                <li>Use automated tools to scrape job data</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">8. Intellectual Property</h2>
              <p>
                The Service and its original content, features, and functionality are owned by GetHiredPOC and are
                protected by international copyright, trademark, and other intellectual property laws.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">9. Limitation of Liability</h2>
              <p>
                GetHiredPOC is provided "as is" without warranties of any kind. We are not responsible for the
                accuracy of job listings or the outcomes of your job search efforts.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">10. Termination</h2>
              <p>
                We reserve the right to terminate or suspend your account at our sole discretion, without notice,
                for conduct that we believe violates these Terms of Service or is harmful to other users or the Service.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">11. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. We will notify users of significant changes
                via email. Continued use of the Service after changes constitutes acceptance of the new terms.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">12. Contact</h2>
              <p>
                If you have questions about these Terms, please contact us at:{' '}
                <a href="mailto:support@allfrontoffice.com" className="text-blue-600 hover:underline">
                  support@allfrontoffice.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
