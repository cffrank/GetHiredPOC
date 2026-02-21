import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export function useApplications() {
  return useQuery({
    queryKey: ['applications'],
    queryFn: () => apiClient.getApplications(),
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ jobId, status }: { jobId: string; status?: string }) =>
      apiClient.createApplication(jobId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

export function useUpdateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      apiClient.updateApplication(id, updates),

    onMutate: async ({ id, updates }) => {
      // 1. Cancel in-flight refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['applications'] });

      // 2. Snapshot current cache for rollback
      const previousApplications = queryClient.getQueryData(['applications']);

      // 3. Optimistically update the cache
      queryClient.setQueryData(['applications'], (old: any) => ({
        ...old,
        applications: old?.applications?.map((app: any) =>
          app.id === id ? { ...app, ...updates } : app
        ),
      }));

      // 4. Return snapshot for rollback in onError
      return { previousApplications };
    },

    onError: (_err, _vars, context) => {
      // Roll back to snapshot on API failure
      if (context?.previousApplications) {
        queryClient.setQueryData(['applications'], context.previousApplications);
      }
    },

    onSettled: () => {
      // Always reconcile with server after mutation settles (success or failure)
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}
