import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { JobSearchPreferences } from '@gethiredpoc/shared';

export function useJobPreferences() {
  return useQuery<JobSearchPreferences>({
    queryKey: ['job-preferences'],
    queryFn: async () => {
      return await apiClient.request('/api/job-preferences');
    }
  });
}

export function useUpdateJobPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: Partial<JobSearchPreferences>) => {
      return await apiClient.request('/api/job-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-preferences'] });
    }
  });
}

export function useIndustries() {
  return useQuery<{ industries: readonly string[] }>({
    queryKey: ['industries'],
    queryFn: async () => {
      return await apiClient.request('/api/job-preferences/industries');
    }
  });
}
