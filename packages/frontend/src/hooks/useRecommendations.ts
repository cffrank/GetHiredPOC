import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export function useRecommendations(limit: number = 10) {
  return useQuery({
    queryKey: ['recommendations', limit],
    queryFn: () => apiClient.getRecommendations(limit),
  });
}
