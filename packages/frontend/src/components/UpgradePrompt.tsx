import { Link } from 'react-router-dom';
import { Button } from './ui/Button';

interface UpgradePromptProps {
  limitType: 'job_imports' | 'applications' | 'resumes' | 'cover_letters';
  currentLimit?: number;
  onClose?: () => void;
}

export function UpgradePrompt({ limitType, currentLimit, onClose }: UpgradePromptProps) {
  const limitMessages = {
    job_imports: {
      title: 'Daily Job Import Limit Reached',
      message: `You've reached your daily limit of ${currentLimit || 3} job imports.`,
      icon: '📥'
    },
    applications: {
      title: 'Monthly Application Limit Reached',
      message: `You've reached your monthly limit of ${currentLimit || 10} applications.`,
      icon: '📝'
    },
    resumes: {
      title: 'Resume Generation Limit Reached',
      message: `You've reached your limit of ${currentLimit || 5} AI-generated resumes.`,
      icon: '📄'
    },
    cover_letters: {
      title: 'Cover Letter Limit Reached',
      message: `You've reached your limit of ${currentLimit || 10} AI-generated cover letters.`,
      icon: '✉️'
    }
  };

  const limit = limitMessages[limitType];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="text-center mb-6">
          <div className="text-5xl mb-4">{limit.icon}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{limit.title}</h2>
          <p className="text-gray-600">{limit.message}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3 text-center">
            Upgrade to PRO for Unlimited Access
          </h3>
          <div className="text-center mb-4">
            <span className="text-3xl font-bold text-green-600">$39</span>
            <span className="text-gray-600 text-sm">/month</span>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start">
              <svg className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700"><strong>Unlimited job imports</strong> daily</span>
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700"><strong>Unlimited applications</strong> per month</span>
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700"><strong>Unlimited AI-generated resumes</strong></span>
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700"><strong>Unlimited cover letters</strong></span>
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700"><strong>Priority support</strong></span>
            </li>
            <li className="flex items-start">
              <svg className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700"><strong>Advanced AI features</strong></span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <Link to="/subscription" className="block">
            <Button
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              Upgrade to PRO Now
            </Button>
          </Link>
          {onClose && (
            <Button
              onClick={onClose}
              variant="outline"
              size="lg"
              className="w-full"
            >
              Maybe Later
            </Button>
          )}
        </div>

        <p className="text-xs text-center text-gray-500 mt-4">
          Cancel anytime. No hidden fees.
        </p>
      </div>
    </div>
  );
}
