import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import PolarCheckout from '../components/PolarCheckout';

interface SubscriptionStatus {
  tier: 'free' | 'pro' | 'trial' | 'paid'; // Support both old and new tier values
  usage: {
    job_imports_today: number;
    applications_this_month: number;
    resumes_generated: number;
    cover_letters_generated: number;
  };
  limits: {
    job_imports_daily: number | null;
    applications_monthly: number | null;
    resumes_total: number | null;
    cover_letters_total: number | null;
  };
  membership_started_at?: number;
  membership_expires_at?: number;
  isTrial?: boolean;
  trialExpiresAt?: number;
  trialDaysRemaining?: number;
}

export default function Subscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const { data: status, isLoading, error } = useQuery<SubscriptionStatus>({
    queryKey: ['subscription', 'status'],
    queryFn: async () => {
      const response = await apiClient.request('/api/subscription/status');

      // Transform API response to match component interface
      return {
        tier: response.subscription.tier,
        usage: {
          job_imports_today: response.usage.jobImports.count,
          applications_this_month: response.usage.applications.count,
          resumes_generated: response.usage.resumesGenerated.count,
          cover_letters_generated: response.usage.coverLettersGenerated.count,
        },
        limits: {
          job_imports_daily: response.usage.jobImports.limit,
          applications_monthly: response.usage.applications.limit,
          resumes_total: response.usage.resumesGenerated.limit,
          cover_letters_total: response.usage.coverLettersGenerated.limit,
        },
        membership_started_at: response.subscription.startedAt,
        membership_expires_at: response.subscription.expiresAt,
        isTrial: response.subscription.isTrial,
        trialExpiresAt: response.subscription.trialExpiresAt,
        trialDaysRemaining: response.subscription.trialDaysRemaining,
      };
    },
  });

  // Check for success parameter from Polar redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');

    if (success === 'true') {
      setShowSuccessMessage(true);

      // Poll for updated subscription status
      const pollInterval = setInterval(async () => {
        await queryClient.invalidateQueries({ queryKey: ['subscription', 'status'] });
      }, 2000);

      // Stop polling after 30 seconds
      setTimeout(() => {
        clearInterval(pollInterval);
      }, 30000);

      // Clean up URL
      window.history.replaceState({}, '', '/subscription');

      return () => clearInterval(pollInterval);
    }
  }, [queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-lg text-gray-600">Loading subscription details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error Loading Subscription</h3>
          <p className="text-red-600 text-sm mt-1">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  // Support both new subscription_tier ('free'/'pro') and old membership_tier ('trial'/'paid')
  const isFree = status?.tier === 'free' && !status?.isTrial;
  const isPro = status?.tier === 'pro' && !status?.isTrial;
  const isTrial = status?.tier === 'pro' && status?.isTrial;

  const UsageBar = ({
    label,
    current,
    limit,
    color = 'blue'
  }: {
    label: string;
    current: number;
    limit: number | null;
    color?: 'blue' | 'green' | 'purple' | 'orange';
  }) => {
    // Treat null or 999999 as unlimited (PRO tier)
    const isUnlimited = limit === null || limit === 999999;
    const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
    const isNearLimit = !isUnlimited && percentage > 80;

    const colorClasses = {
      blue: {
        bg: 'bg-blue-100',
        fill: isNearLimit ? 'bg-red-500' : 'bg-blue-600',
        text: 'text-blue-700'
      },
      green: {
        bg: 'bg-green-100',
        fill: isNearLimit ? 'bg-red-500' : 'bg-green-600',
        text: 'text-green-700'
      },
      purple: {
        bg: 'bg-purple-100',
        fill: isNearLimit ? 'bg-red-500' : 'bg-purple-600',
        text: 'text-purple-700'
      },
      orange: {
        bg: 'bg-orange-100',
        fill: isNearLimit ? 'bg-red-500' : 'bg-orange-600',
        text: 'text-orange-700'
      },
    };

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className={`text-sm font-semibold ${colorClasses[color].text}`}>
            {current} / {isUnlimited ? 'Unlimited' : limit}
          </span>
        </div>
        <div className={`w-full ${colorClasses[color].bg} rounded-full h-3 overflow-hidden`}>
          <div
            className={`h-full ${colorClasses[color].fill} transition-all duration-300 rounded-full`}
            style={{ width: isUnlimited ? '100%' : `${percentage}%` }}
          />
        </div>
        {isNearLimit && (
          <p className="text-xs text-red-600 mt-1">
            You're approaching your limit! Consider upgrading to PRO.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Success message after Polar checkout */}
      {showSuccessMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-6 h-6 text-green-600 mr-3 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-green-800 font-semibold">Payment Successful!</h3>
              <p className="text-green-700 text-sm mt-1">
                Thank you for upgrading to PRO! Your account is being activated. This may take a few moments.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header with Tier Badge */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subscription</h1>
          <p className="text-gray-600 mt-2">Manage your subscription and view usage</p>
        </div>
        <div>
          {isFree && (
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 text-gray-700 border border-gray-300">
              FREE
            </span>
          )}
          {isTrial && (
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-700 border border-blue-600">
              PRO TRIAL
            </span>
          )}
          {isPro && (
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-700 border border-green-600">
              PRO
            </span>
          )}
        </div>
      </div>

      {/* Current Tier Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Current Plan</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Plan:</span>
            <span className="font-semibold text-gray-900">
              {isFree ? 'FREE' : isTrial ? 'PRO Trial' : 'PRO'}
            </span>
          </div>
          {isTrial && status?.trialDaysRemaining !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600">Trial ends in:</span>
              <span className={`font-semibold ${status.trialDaysRemaining <= 3 ? 'text-red-600' : 'text-blue-600'}`}>
                {status.trialDaysRemaining} {status.trialDaysRemaining === 1 ? 'day' : 'days'}
              </span>
            </div>
          )}
          {isTrial && status?.trialExpiresAt && (
            <div className="flex justify-between">
              <span className="text-gray-600">Trial expires:</span>
              <span className="font-semibold text-gray-900">
                {new Date(status.trialExpiresAt * 1000).toLocaleDateString()}
              </span>
            </div>
          )}
          {status?.membership_started_at && (
            <div className="flex justify-between">
              <span className="text-gray-600">Member since:</span>
              <span className="font-semibold text-gray-900">
                {new Date(status.membership_started_at).toLocaleDateString()}
              </span>
            </div>
          )}
          {isPro && status?.membership_expires_at && (
            <div className="flex justify-between">
              <span className="text-gray-600">Next billing date:</span>
              <span className="font-semibold text-gray-900">
                {new Date(status.membership_expires_at).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Email:</span>
            <span className="font-semibold text-gray-900">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Usage Dashboard */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Usage Dashboard</h2>
        <div className="space-y-6">
          <UsageBar
            label="Job Imports Today"
            current={status?.usage.job_imports_today || 0}
            limit={status?.limits.job_imports_daily || null}
            color="blue"
          />
          <UsageBar
            label="Applications This Month"
            current={status?.usage.applications_this_month || 0}
            limit={status?.limits.applications_monthly || null}
            color="green"
          />
          <UsageBar
            label="Resumes Generated"
            current={status?.usage.resumes_generated || 0}
            limit={status?.limits.resumes_total || null}
            color="purple"
          />
          <UsageBar
            label="Cover Letters Generated"
            current={status?.usage.cover_letters_generated || 0}
            limit={status?.limits.cover_letters_total || null}
            color="orange"
          />
        </div>
      </div>

      {/* Upgrade Section (show for free and trial users) */}
      {(isFree || isTrial) && (
        <div className="bg-gradient-to-br from-blue-50 to-green-50 border border-blue-200 rounded-lg p-8 shadow-md">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isTrial ? 'Keep Your PRO Access' : 'Upgrade to PRO'}
            </h2>
            <p className="text-gray-700">
              {isTrial ? 'Continue enjoying unlimited access after your trial ends' : 'Unlock unlimited access to all features'}
            </p>
            <div className="mt-4">
              <span className="text-4xl font-bold text-green-600">$39</span>
              <span className="text-gray-600 text-lg">/month</span>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">PRO Benefits:</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700"><strong>Unlimited job imports</strong> - Import as many jobs as you need, every day</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700"><strong>Unlimited applications</strong> - Track all your job applications without limits</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700"><strong>Unlimited AI-generated resumes</strong> - Create tailored resumes for every job</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700"><strong>Unlimited cover letters</strong> - Generate personalized cover letters instantly</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700"><strong>Priority support</strong> - Get help when you need it</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700"><strong>Advanced AI features</strong> - Access to latest AI capabilities</span>
              </li>
            </ul>
          </div>

          <div className="max-w-md mx-auto">
            <PolarCheckout
              onSuccess={() => {
                // Success will be handled by URL parameter check in useEffect
                console.log('Redirecting to Polar checkout...');
              }}
              onError={(error) => {
                console.error('Checkout error:', error);
              }}
            />
          </div>
        </div>
      )}

      {/* Current PRO member message */}
      {isPro && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-green-800 mb-2">You're a PRO member!</h3>
          <p className="text-green-700">
            Thank you for supporting JobMatch AI. Enjoy unlimited access to all features.
          </p>
        </div>
      )}
    </div>
  );
}
