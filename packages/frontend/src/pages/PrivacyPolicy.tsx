import { Navigation } from '../components/Navigation';

export default function PrivacyPolicy() {
  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
            <div className="prose prose-gray max-w-none">
              <p className="text-sm text-gray-500 mb-6">Last Updated: January 7, 2026</p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">1. Information We Collect</h2>

              <h3 className="text-xl font-semibold mt-6 mb-3">Account Information</h3>
              <p>When you create an account, we collect:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Email address</li>
                <li>Password (encrypted)</li>
                <li>Full name (optional)</li>
                <li>Location (optional)</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3">Profile Information</h3>
              <p>You may choose to provide:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Resume and work experience</li>
                <li>Education history</li>
                <li>Skills and qualifications</li>
                <li>LinkedIn profile URL</li>
                <li>Professional bio</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3">Usage Data</h3>
              <p>We automatically collect:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Job searches and search history</li>
                <li>Application tracking data</li>
                <li>Saved jobs and preferences</li>
                <li>AI-generated content (resumes, cover letters)</li>
                <li>Usage statistics (searches per day, applications per month)</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Provide and improve the Service</li>
                <li>Match you with relevant job opportunities</li>
                <li>Generate personalized resumes and cover letters using AI</li>
                <li>Track your subscription tier and usage limits</li>
                <li>Send you service notifications and updates</li>
                <li>Process payments for PRO subscriptions</li>
                <li>Analyze usage patterns to improve our algorithms</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">3. Information Sharing</h2>
              <p>We do NOT sell your personal information. We may share data with:</p>

              <h3 className="text-xl font-semibold mt-6 mb-3">Service Providers</h3>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Cloudflare:</strong> Infrastructure and hosting</li>
                <li><strong>Polar.sh:</strong> Payment processing (PRO subscriptions)</li>
                <li><strong>Resend:</strong> Email delivery</li>
                <li><strong>OpenAI:</strong> AI-powered features (resume/cover letter generation, job matching)</li>
                <li><strong>Apify:</strong> Job data aggregation</li>
              </ul>

              <h3 className="text-xl font-semibold mt-6 mb-3">Legal Requirements</h3>
              <p>
                We may disclose your information if required by law or in response to valid requests by public
                authorities (e.g., a court or government agency).
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Security</h2>
              <p>We implement security measures including:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Encrypted passwords using bcrypt</li>
                <li>HTTPS/TLS encryption for all data in transit</li>
                <li>Secure session management</li>
                <li>Regular security audits</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">5. Data Retention</h2>
              <p>
                We retain your account information for as long as your account is active or as needed to provide
                you with the Service. You may delete your account at any time, after which we will delete your
                personal information within 30 days, except where we are required to retain it for legal purposes.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Delete your account and data</li>
                <li>Export your data</li>
                <li>Opt out of marketing emails</li>
                <li>Object to processing of your data</li>
              </ul>

              <h2 className="text-2xl font-semibold mt-8 mb-4">7. Cookies and Tracking</h2>
              <p>
                We use essential cookies for authentication and session management. We use Cloudflare Analytics
                for understanding service usage. We do not use third-party advertising trackers.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">8. AI and Data Processing</h2>
              <p>
                Your profile information and job preferences are processed by AI models (OpenAI GPT-4) to:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Match you with relevant jobs</li>
                <li>Generate personalized resumes</li>
                <li>Create tailored cover letters</li>
                <li>Analyze job descriptions</li>
              </ul>
              <p>
                We do not use your data to train AI models. Your data is processed in real-time and not stored
                by the AI provider.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">9. Children's Privacy</h2>
              <p>
                Our Service is not intended for individuals under the age of 18. We do not knowingly collect
                personal information from children.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">10. Changes to Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any significant
                changes by email or through a prominent notice on the Service.
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">11. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or want to exercise your rights, contact us at:{' '}
                <a href="mailto:privacy@allfrontoffice.com" className="text-blue-600 hover:underline">
                  privacy@allfrontoffice.com
                </a>
              </p>

              <h2 className="text-2xl font-semibold mt-8 mb-4">12. Data Protection Officer</h2>
              <p>
                For EU users exercising GDPR rights, you may contact our Data Protection Officer at:{' '}
                <a href="mailto:dpo@allfrontoffice.com" className="text-blue-600 hover:underline">
                  dpo@allfrontoffice.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
