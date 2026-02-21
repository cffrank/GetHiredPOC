import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:8787';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  full_name: 'Test User',
  bio: 'A test user bio',
  location: 'San Francisco, CA',
  skills: '["React","TypeScript","Node.js"]',
  avatar_url: null,
  address: '123 Main St, San Francisco, CA 94102',
  linkedin_url: 'https://linkedin.com/in/testuser',
  role: 'user' as const,
  membership_tier: 'trial' as const,
  created_at: 1700000000,
  updated_at: 1700000000,
};

const mockJob = {
  id: 'job-1',
  title: 'Software Engineer',
  company: 'Acme Corp',
  location: 'San Francisco, CA',
  description: 'We are looking for a skilled software engineer to join our team.',
  requirements: '["3+ years of React experience","TypeScript proficiency","Node.js knowledge"]',
  remote: 1,
  salary_min: 120000,
  salary_max: 160000,
  created_at: 1700000000,
  updated_at: 1700000000,
};

const mockApplication = {
  id: 'app-1',
  status: 'applied',
  job: {
    id: 'job-1',
    title: 'Software Engineer',
    company: 'Acme Corp',
    location: 'San Francisco, CA',
    remote: 1,
  },
  created_at: 1700000000,
  updated_at: 1700000000,
};

const mockPreferences = {
  userId: 'user-1',
  desiredJobTitles: ['Software Engineer'],
  workLocations: ['San Francisco, CA'],
  workMode: 'remote' as const,
  industries: ['Technology'],
  employmentStatus: 'employed-open' as const,
  availabilityDate: null,
  willingToRelocate: false,
  requiresVisaSponsorship: 'no' as const,
  hasDriversLicense: 'yes' as const,
  hasSecurityClearance: 'no' as const,
  genderIdentity: 'prefer-not-to-say' as const,
  hasDisability: 'prefer-not-to-say' as const,
  onboardingCompleted: true,
  createdAt: 1700000000,
  updatedAt: 1700000000,
};

export const handlers = [
  // Auth
  http.get(`${API_URL}/api/auth/me`, () => {
    return HttpResponse.json({ user: mockUser });
  }),

  // Job preferences (needed by ProtectedRoute)
  http.get(`${API_URL}/api/job-preferences`, () => {
    return HttpResponse.json(mockPreferences);
  }),

  // Profile
  http.get(`${API_URL}/api/profile`, () => {
    return HttpResponse.json({ user: mockUser });
  }),

  http.put(`${API_URL}/api/profile`, () => {
    return HttpResponse.json({ user: mockUser });
  }),

  // Applications
  http.get(`${API_URL}/api/applications`, () => {
    return HttpResponse.json({ applications: [mockApplication] });
  }),

  http.post(`${API_URL}/api/applications`, () => {
    return HttpResponse.json({ application: mockApplication });
  }),

  http.put(`${API_URL}/api/applications/:id`, () => {
    return HttpResponse.json({ application: mockApplication });
  }),

  http.delete(`${API_URL}/api/applications/:id`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Jobs
  http.get(`${API_URL}/api/jobs`, () => {
    return HttpResponse.json({ jobs: [mockJob], nextCursor: null, hasMore: false });
  }),

  http.get(`${API_URL}/api/jobs/:id`, () => {
    return HttpResponse.json({ job: mockJob, saved: false });
  }),

  http.post(`${API_URL}/api/jobs/:id/save`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.delete(`${API_URL}/api/jobs/:id/save`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Work experience and education (used by Profile page sub-components)
  http.get(`${API_URL}/api/work-experience`, () => {
    return HttpResponse.json({ workExperience: [] });
  }),

  http.get(`${API_URL}/api/education`, () => {
    return HttpResponse.json({ education: [] });
  }),
];
