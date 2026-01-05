// Job Search Preferences Types

export interface JobSearchPreferences {
  userId: string;

  // Core Job Search
  desiredJobTitles: string[]; // ["Software Engineer", "Full Stack Developer"]
  workLocations: string[]; // ["San Francisco, CA", "Remote"]
  workMode: 'remote' | 'hybrid' | 'onsite' | 'any';
  industries: string[];

  // Employment Context
  employmentStatus: 'unemployed-urgent' | 'unemployed-relaxed' | 'badly-employed' | 'employed-open';
  availabilityDate: string | null; // ISO date string
  willingToRelocate: boolean;

  // Legal Requirements
  requiresVisaSponsorship: 'yes' | 'no' | 'prefer-not-to-say';
  hasDriversLicense: 'yes' | 'no' | 'prefer-not-to-say';
  hasSecurityClearance: 'yes' | 'no' | 'prefer-not-to-say';

  // Demographics (optional)
  genderIdentity: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | 'self-describe';
  genderSelfDescribe?: string;
  hasDisability: 'yes' | 'no' | 'prefer-not-to-say';

  // Metadata
  onboardingCompleted: boolean;
  createdAt: number;
  updatedAt: number;
}

// Predefined industry list based on common job market categories
export const INDUSTRIES = [
  'Agriculture, Forestry & Fishing',
  'Aerospace & Aviation',
  'Architecture & Construction',
  'Arts, Entertainment & Media',
  'Automotive',
  'Banking & Financial Services',
  'Biotechnology',
  'Consulting & Professional Services',
  'Consumer Goods & Retail',
  'Defense & Military',
  'Education & Training',
  'Energy & Utilities',
  'Engineering',
  'Environmental Services',
  'Government & Public Sector',
  'Healthcare & Medical',
  'Hospitality & Tourism',
  'Insurance',
  'Legal Services',
  'Manufacturing & Production',
  'Marketing & Advertising',
  'Non-Profit & Social Services',
  'Pharmaceuticals',
  'Real Estate',
  'Technology & Software',
  'Telecommunications',
  'Transportation & Logistics',
  'Other'
] as const;

// Employment status display labels
export const EMPLOYMENT_STATUS_LABELS: Record<JobSearchPreferences['employmentStatus'], string> = {
  'unemployed-urgent': 'Unemployed, really need a job',
  'unemployed-relaxed': 'Unemployed, not stressed though',
  'badly-employed': 'Badly employed, needing a job switch',
  'employed-open': 'Employed, open to greener pastures'
};

// Work mode display labels
export const WORK_MODE_LABELS: Record<JobSearchPreferences['workMode'], string> = {
  'remote': 'Remote only',
  'hybrid': 'Hybrid (mix of remote and in-person)',
  'onsite': 'On-site only',
  'any': 'Any work arrangement'
};
