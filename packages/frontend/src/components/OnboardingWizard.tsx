import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { JobSearchPreferences } from '@gethiredpoc/shared';
import { EMPLOYMENT_STATUS_LABELS, WORK_MODE_LABELS } from '@gethiredpoc/shared';

interface OnboardingWizardProps {
  onComplete: () => void;
  initialData?: Partial<JobSearchPreferences>;
  isEditing?: boolean;
}

const TOTAL_STEPS = 8;

export function OnboardingWizard({ onComplete, initialData, isEditing = false }: OnboardingWizardProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<JobSearchPreferences>>({
    employmentStatus: 'employed-open',
    desiredJobTitles: [],
    availabilityDate: null,
    industries: [],
    workLocations: [],
    workMode: 'any',
    willingToRelocate: false,
    requiresVisaSponsorship: 'prefer-not-to-say',
    hasDriversLicense: 'prefer-not-to-say',
    hasSecurityClearance: 'prefer-not-to-say',
    genderIdentity: 'prefer-not-to-say',
    hasDisability: 'prefer-not-to-say',
    ...initialData
  });

  // Temporary input states for multi-select fields
  const [jobTitleInput, setJobTitleInput] = useState('');
  const [locationInput, setLocationInput] = useState('');

  // Fetch industries list
  const { data: industriesData } = useQuery({
    queryKey: ['industries'],
    queryFn: async () => {
      const res = await apiClient.request('/api/job-preferences/industries');
      return res as { industries: readonly string[] };
    }
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (preferences: Partial<JobSearchPreferences>) => {
      return await apiClient.request('/api/job-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...preferences, onboardingCompleted: true })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-preferences'] });
      onComplete();
    }
  });

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      // Final step - save preferences
      updatePreferencesMutation.mutate(formData);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      updatePreferencesMutation.mutate(formData);
    }
  };

  const updateFormData = (updates: Partial<JobSearchPreferences>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const addJobTitle = () => {
    if (jobTitleInput.trim() && !formData.desiredJobTitles?.includes(jobTitleInput.trim())) {
      updateFormData({
        desiredJobTitles: [...(formData.desiredJobTitles || []), jobTitleInput.trim()]
      });
      setJobTitleInput('');
    }
  };

  const removeJobTitle = (title: string) => {
    updateFormData({
      desiredJobTitles: formData.desiredJobTitles?.filter(t => t !== title)
    });
  };

  const addLocation = () => {
    if (locationInput.trim() && !formData.workLocations?.includes(locationInput.trim())) {
      updateFormData({
        workLocations: [...(formData.workLocations || []), locationInput.trim()]
      });
      setLocationInput('');
    }
  };

  const removeLocation = (location: string) => {
    updateFormData({
      workLocations: formData.workLocations?.filter(l => l !== location)
    });
  };

  const toggleIndustry = (industry: string) => {
    const current = formData.industries || [];
    if (current.includes(industry)) {
      updateFormData({ industries: current.filter(i => i !== industry) });
    } else {
      updateFormData({ industries: [...current, industry] });
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        // Employment Status
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Describe your current employment status</h2>
            <div className="space-y-3">
              {(['unemployed-urgent', 'unemployed-relaxed', 'badly-employed', 'employed-open'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => updateFormData({ employmentStatus: status })}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    formData.employmentStatus === status
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-gray-900">{EMPLOYMENT_STATUS_LABELS[status]}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        // Job Titles
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">What's your desired job title?</h2>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={jobTitleInput}
                  onChange={(e) => setJobTitleInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addJobTitle())}
                  placeholder="Type to search or add a job title"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                {formData.desiredJobTitles?.map(title => (
                  <div key={title} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-900">{title}</span>
                    <button
                      onClick={() => removeJobTitle(title)}
                      className="text-red-500 hover:text-red-700 text-xl"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {formData.desiredJobTitles?.length === 0 && (
                <button
                  onClick={() => {
                    updateFormData({ desiredJobTitles: ['Software Engineer', 'Full Stack Developer'] });
                  }}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-orange-500 hover:text-orange-500"
                >
                  + Add example titles
                </button>
              )}
            </div>
          </div>
        );

      case 3:
        // Availability Date
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">When are you available to start?</h2>
            <div className="space-y-3">
              <input
                type="date"
                value={formData.availabilityDate || ''}
                onChange={(e) => updateFormData({ availabilityDate: e.target.value || null })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
              <button
                onClick={() => updateFormData({ availabilityDate: null })}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  !formData.availabilityDate
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                ASAP
              </button>
            </div>
          </div>
        );

      case 4:
        // Industries
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">What industries are you interested in?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {industriesData?.industries.map(industry => (
                <button
                  key={industry}
                  onClick={() => toggleIndustry(industry)}
                  className={`p-4 text-left rounded-lg border-2 transition-all ${
                    formData.industries?.includes(industry)
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {formData.industries?.includes(industry) && (
                      <span className="text-orange-500">✓</span>
                    )}
                    <span className="text-gray-900 text-sm">{industry}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 5:
        // Work Locations
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Where would you like to work?</h2>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                  placeholder="Type to search or add a city"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!formData.workLocations?.includes('Remote')) {
                      updateFormData({ workLocations: [...(formData.workLocations || []), 'Remote'] });
                    }
                  }}
                  className={`px-4 py-2 rounded-lg border-2 ${
                    formData.workLocations?.includes('Remote')
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Remote
                </button>
                <button
                  onClick={() => {
                    if (!formData.workLocations?.includes('Hybrid')) {
                      updateFormData({ workLocations: [...(formData.workLocations || []), 'Hybrid'] });
                    }
                  }}
                  className={`px-4 py-2 rounded-lg border-2 ${
                    formData.workLocations?.includes('Hybrid')
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  In-person/hybrid
                </button>
              </div>
              <div className="space-y-2">
                {formData.workLocations?.map(location => (
                  <div key={location} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-900">{location}</span>
                    <button
                      onClick={() => removeLocation(location)}
                      className="text-red-500 hover:text-red-700 text-xl"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-orange-50 rounded-lg flex items-start gap-3">
                <span className="text-orange-600 text-2xl">💡</span>
                <p className="text-sm text-gray-700">
                  Pick your locations (and "Remote," if you'd like). More locations mean more opportunities.
                </p>
              </div>
            </div>
          </div>
        );

      case 6:
        // Relocation
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Are you willing to relocate for a job?</h2>
            <div className="space-y-3">
              <button
                onClick={() => updateFormData({ willingToRelocate: true })}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  formData.willingToRelocate
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-gray-900">Yes</span>
              </button>
              <button
                onClick={() => updateFormData({ willingToRelocate: false })}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  !formData.willingToRelocate
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-gray-900">No</span>
              </button>
            </div>
          </div>
        );

      case 7:
        // Legal Requirements (optional)
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Legal Requirements (Optional)</h2>
            <p className="text-gray-600">You can skip this section if you prefer not to answer.</p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Do you require visa sponsorship in the US?
                </label>
                <div className="space-y-2">
                  {(['yes', 'no', 'prefer-not-to-say'] as const).map(value => (
                    <button
                      key={value}
                      onClick={() => updateFormData({ requiresVisaSponsorship: value })}
                      className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                        formData.requiresVisaSponsorship === value
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {value === 'yes' ? 'Yes' : value === 'no' ? 'No' : 'I do not wish to provide this information'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Do you have a current driver's license?
                </label>
                <div className="space-y-2">
                  {(['yes', 'no', 'prefer-not-to-say'] as const).map(value => (
                    <button
                      key={value}
                      onClick={() => updateFormData({ hasDriversLicense: value })}
                      className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                        formData.hasDriversLicense === value
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {value === 'yes' ? 'Yes' : value === 'no' ? 'No' : 'I do not wish to provide this information'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Do you currently have an active United States security clearance?
                </label>
                <div className="space-y-2">
                  {(['yes', 'no', 'prefer-not-to-say'] as const).map(value => (
                    <button
                      key={value}
                      onClick={() => updateFormData({ hasSecurityClearance: value })}
                      className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                        formData.hasSecurityClearance === value
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {value === 'yes' ? 'Yes' : value === 'no' ? 'No' : 'I do not wish to provide this information'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 8:
        // Demographics (optional)
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Demographics (Optional)</h2>
            <p className="text-gray-600">You can skip this section if you prefer not to answer.</p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How do you identify?
                </label>
                <div className="space-y-2">
                  {(['male', 'female', 'non-binary', 'prefer-not-to-say', 'self-describe'] as const).map(value => (
                    <button
                      key={value}
                      onClick={() => updateFormData({ genderIdentity: value })}
                      className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                        formData.genderIdentity === value
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {value === 'male' ? 'Male' :
                       value === 'female' ? 'Female' :
                       value === 'non-binary' ? 'Non-binary or prefer to self-describe' :
                       value === 'prefer-not-to-say' ? 'Prefer not to say' :
                       'I prefer to self-describe'}
                    </button>
                  ))}
                </div>
                {formData.genderIdentity === 'self-describe' && (
                  <input
                    type="text"
                    value={formData.genderSelfDescribe || ''}
                    onChange={(e) => updateFormData({ genderSelfDescribe: e.target.value })}
                    placeholder="Please specify"
                    className="mt-2 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Do you have a disability or chronic condition that limits your major life activities?
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Disabilities can be physical, visual, auditory, cognitive, mental, or emotional.
                </p>
                <div className="space-y-2">
                  {(['yes', 'no', 'prefer-not-to-say'] as const).map(value => (
                    <button
                      key={value}
                      onClick={() => updateFormData({ hasDisability: value })}
                      className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                        formData.hasDisability === value
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {value === 'yes' ? 'Yes' : value === 'no' ? 'No' : 'I do not wish to provide this information'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
        {renderStep()}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className="px-6 py-3 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 rounded-lg transition-colors"
        >
          ← Back
        </button>

        <div className="flex gap-3">
          {step >= 7 && (
            <button
              onClick={handleSkip}
              className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Skip
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={updatePreferencesMutation.isPending}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm disabled:opacity-50"
          >
            {updatePreferencesMutation.isPending ? 'Saving...' : step === TOTAL_STEPS ? 'Complete' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
