import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { Navigation } from '../components/Navigation';

interface EmailPreferences {
  digestEnabled: boolean;
  statusUpdatesEnabled: boolean;
  remindersEnabled: boolean;
  digestFrequency: 'daily' | 'weekly' | 'monthly';
}

export default function Settings() {
  const queryClient = useQueryClient();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Fetch email preferences
  const { data: preferences, isLoading } = useQuery<EmailPreferences>({
    queryKey: ['email-preferences'],
    queryFn: () => apiClient.request('/api/email-preferences')
  });

  // Update preferences mutation
  const updateMutation = useMutation({
    mutationFn: (newPreferences: Partial<EmailPreferences>) =>
      apiClient.request('/api/email-preferences', {
        method: 'PUT',
        body: JSON.stringify(newPreferences)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-preferences'] });
      setSaveMessage('Preferences saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    }
  });

  const handleToggle = (field: keyof EmailPreferences) => {
    if (!preferences) return;

    updateMutation.mutate({
      [field]: !preferences[field]
    });
  };

  const handleFrequencyChange = (frequency: 'daily' | 'weekly' | 'monthly') => {
    updateMutation.mutate({ digestFrequency: frequency });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">Loading settings...</div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12 text-red-600">Failed to load preferences</div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account preferences</p>
        </div>

      {saveMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {saveMessage}
        </div>
      )}

      {/* Email Notifications */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Email Notifications</h2>
        <p className="text-gray-600 text-sm mb-6">
          Choose which emails you'd like to receive
        </p>

        <div className="space-y-4">
          {/* Status Updates */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">Status Update Emails</h3>
              <p className="text-sm text-gray-600 mt-1">
                Get notified when your application status changes
              </p>
            </div>
            <button
              onClick={() => handleToggle('statusUpdatesEnabled')}
              disabled={updateMutation.isPending}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.statusUpdatesEnabled ? 'bg-blue-600' : 'bg-gray-200'
              } disabled:opacity-50`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.statusUpdatesEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Reminders */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">Reminder Emails</h3>
              <p className="text-sm text-gray-600 mt-1">
                Receive reminders about pending applications and follow-ups
              </p>
            </div>
            <button
              onClick={() => handleToggle('remindersEnabled')}
              disabled={updateMutation.isPending}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.remindersEnabled ? 'bg-blue-600' : 'bg-gray-200'
              } disabled:opacity-50`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.remindersEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Digest */}
          <div className="py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Weekly Digest</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Get a summary of your job search activity
                </p>
              </div>
              <button
                onClick={() => handleToggle('digestEnabled')}
                disabled={updateMutation.isPending}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.digestEnabled ? 'bg-blue-600' : 'bg-gray-200'
                } disabled:opacity-50`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.digestEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {preferences.digestEnabled && (
              <div className="ml-4 mt-3">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Frequency
                </label>
                <div className="flex gap-2">
                  {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                    <button
                      key={freq}
                      onClick={() => handleFrequencyChange(freq)}
                      disabled={updateMutation.isPending}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                        preferences.digestFrequency === freq
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Export Resume</h2>
        <p className="text-gray-600 text-sm mb-6">
          Download your resume in different formats
        </p>

        <div className="flex gap-3">
          <a
            href={`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/export/resume/pdf`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download as PDF
          </a>
          <a
            href={`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/export/resume/docx`}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download as DOCX
          </a>
        </div>
      </div>
    </div>
    </>
  );
}
