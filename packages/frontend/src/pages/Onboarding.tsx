import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { OnboardingWizard } from '../components/OnboardingWizard';
import type { JobSearchPreferences } from '@gethiredpoc/shared';

export default function Onboarding() {
  const navigate = useNavigate();

  // Check if user already completed onboarding
  const { data: preferences, isLoading } = useQuery<JobSearchPreferences>({
    queryKey: ['job-preferences'],
    queryFn: async () => {
      return await apiClient.request('/api/job-preferences');
    }
  });

  useEffect(() => {
    if (preferences?.onboardingCompleted) {
      navigate('/jobs');
    }
  }, [preferences, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome! Let's personalize your job search
          </h1>
          <p className="text-gray-600">
            Help us find the perfect jobs for you by answering a few questions
          </p>
        </div>

        <OnboardingWizard
          onComplete={() => navigate('/jobs')}
          initialData={preferences}
        />
      </div>
    </div>
  );
}
