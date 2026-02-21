import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => apiClient.getProfile(),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: any) => apiClient.updateProfile(updates),
    onSuccess: (data) => {
      // Immediately update both profile and auth caches with response data
      queryClient.setQueryData(['profile'], data);
      queryClient.setQueryData(['auth', 'me'], { user: data.profile });
    },
  });
}

export function useUpdateProfileWithFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => apiClient.updateProfileWithFile(formData),
    onSuccess: (data) => {
      // Immediately update both profile and auth caches with response data
      queryClient.setQueryData(['profile'], data);
      queryClient.setQueryData(['auth', 'me'], { user: data.profile });
    },
  });
}
