const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export const apiClient = {
  async request(endpoint: string, options?: RequestInit) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  },

  async requestFormData(endpoint: string, formData: FormData) {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  },

  // Auth
  signup: (email: string, password: string) =>
    apiClient.request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    apiClient.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    apiClient.request('/api/auth/logout', {
      method: 'POST',
    }),

  me: () => apiClient.request('/api/auth/me'),

  // Jobs
  getJobs: (filters?: { title?: string; remote?: boolean; location?: string }) => {
    const params = new URLSearchParams();
    if (filters?.title) params.set('title', filters.title);
    if (filters?.remote !== undefined) params.set('remote', String(filters.remote));
    if (filters?.location) params.set('location', filters.location);
    const query = params.toString();
    return apiClient.request(`/api/jobs${query ? `?${query}` : ''}`);
  },

  getJob: (id: string) => apiClient.request(`/api/jobs/${id}`),

  saveJob: (id: string) =>
    apiClient.request(`/api/jobs/${id}/save`, {
      method: 'POST',
    }),

  unsaveJob: (id: string) =>
    apiClient.request(`/api/jobs/${id}/save`, {
      method: 'DELETE',
    }),

  getSavedJobs: () => apiClient.request('/api/jobs/saved/list'),

  analyzeJob: (id: string) =>
    apiClient.request(`/api/jobs/${id}/analyze`, {
      method: 'POST',
    }),

  generateResume: (id: string) =>
    apiClient.request(`/api/ai/jobs/${id}/generate-resume`, {
      method: 'POST',
    }),

  generateCoverLetter: (id: string) =>
    apiClient.request(`/api/ai/jobs/${id}/generate-cover-letter`, {
      method: 'POST',
    }),

  quickMatch: (id: string) =>
    apiClient.request(`/api/ai/jobs/${id}/quick-match`),

  // Applications
  getApplications: () => apiClient.request('/api/applications'),

  createApplication: (job_id: string, status?: string) =>
    apiClient.request('/api/applications', {
      method: 'POST',
      body: JSON.stringify({ job_id, status }),
    }),

  updateApplication: (id: string, updates: any) =>
    apiClient.request(`/api/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteApplication: (id: string) =>
    apiClient.request(`/api/applications/${id}`, {
      method: 'DELETE',
    }),

  // Profile
  getProfile: () => apiClient.request('/api/profile'),

  updateProfile: (updates: any) =>
    apiClient.request('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  updateProfileWithFile: (formData: FormData) =>
    apiClient.requestFormData('/api/profile', formData),

  // Recommendations
  getRecommendations: (limit?: number) => {
    const params = limit ? `?limit=${limit}` : '';
    return apiClient.request(`/api/recommendations${params}`);
  },
};
