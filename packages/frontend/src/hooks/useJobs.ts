import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export function useJobs(filters?: { title?: string; remote?: boolean; location?: string }) {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => apiClient.getJobs(filters),
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: () => apiClient.getJob(id),
    enabled: !!id,
  });
}

export function useSavedJobs() {
  return useQuery({
    queryKey: ['jobs', 'saved'],
    queryFn: () => apiClient.getSavedJobs(),
  });
}

export function useSaveJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => apiClient.saveJob(jobId),
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['jobs', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'saved'] });
    },
  });
}

export function useUnsaveJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => apiClient.unsaveJob(jobId),
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['jobs', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'saved'] });
    },
  });
}

export function useAnalyzeJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => apiClient.analyzeJob(jobId),
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['jobs', jobId, 'analysis'] });
    },
  });
}
