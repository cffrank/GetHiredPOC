import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../lib/api-client';
import { Button3D } from './ui/Button3D';
import { Bell, Mail, Download, Settings as SettingsIcon } from 'lucide-react';

interface EmailPreferences {
  digestEnabled: boolean;
  statusUpdatesEnabled: boolean;
  remindersEnabled: boolean;
  digestFrequency: 'daily' | 'weekly' | 'monthly';
}

export function SettingsTab() {
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
      <div className="text-center py-12">
        <div className="animate-pulse text-violet font-bold text-lg">Loading settings... ✨</div>
      </div>
    );
  }

  if (!preferences) {
    return <div className="text-center py-12 text-red-600 font-bold">Failed to load preferences ⚠️</div>;
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-4xl font-extrabold mb-3 bg-gradient-to-r from-violet to-teal bg-clip-text text-transparent">
          Settings ⚙️
        </h2>
        <p className="text-gray-600 text-lg">Manage your account preferences</p>
      </div>

      {saveMessage && (
        <div className="p-6 bg-gradient-to-r from-green-50 to-teal-50 border-2 border-green-300 rounded-3xl text-green-800 shadow-3d-sm animate-bounce-in">
          <p className="font-bold flex items-center gap-2">
            ✅ {saveMessage}
          </p>
        </div>
      )}

      {/* Email Notifications */}
      <div className="bg-white rounded-3xl shadow-3d border-2 border-gray-100 p-8 hover:shadow-3d-lg transition-all">
        <h3 className="text-2xl font-extrabold mb-4 text-purple-deep flex items-center gap-3">
          <Mail className="w-7 h-7 text-violet" />
          Email Notifications 📧
        </h3>
        <p className="text-gray-600 text-sm mb-6">
          Choose which emails you'd like to receive
        </p>

        <div className="space-y-4">
          {/* Status Updates */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">Status Update Emails</h4>
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
              <h4 className="font-medium text-gray-900">Reminder Emails</h4>
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
                <h4 className="font-medium text-gray-900">Weekly Digest</h4>
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

      {/* Job Search Preferences */}
      <div className="bg-white rounded-3xl shadow-3d border-2 border-gray-100 p-8 hover:shadow-3d-lg transition-all">
        <h3 className="text-2xl font-extrabold mb-4 text-purple-deep flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-teal" />
          Job Search Preferences 🎯
        </h3>
        <p className="text-gray-600 text-base mb-6">
          Update your job preferences to get better recommendations
        </p>

        <Link to="/preferences">
          <Button3D
            icon={<SettingsIcon className="w-5 h-5" />}
            className="w-full justify-center"
          >
            Edit Preferences
          </Button3D>
        </Link>
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-3xl shadow-3d border-2 border-gray-100 p-8 hover:shadow-3d-lg transition-all">
        <h3 className="text-2xl font-extrabold mb-4 text-purple-deep flex items-center gap-3">
          <Download className="w-7 h-7 text-coral" />
          Export Resume 📄
        </h3>
        <p className="text-gray-600 text-base mb-6">
          Download your resume in different formats
        </p>

        <div className="flex gap-3 flex-wrap">
          <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/export/resume/pdf`}>
            <Button3D
              icon="📄"
              variant="primary"
            >
              Download as PDF
            </Button3D>
          </a>
          <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/export/resume/docx`}>
            <Button3D
              icon="📝"
              variant="secondary"
            >
              Download as DOCX
            </Button3D>
          </a>
        </div>
      </div>
    </div>
  );
}
