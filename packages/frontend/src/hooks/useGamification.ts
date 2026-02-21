import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export function useGamification() {
  return useQuery({
    queryKey: ['gamification'],
    queryFn: () => apiClient.getGamificationStats(),
    // Refetch every 30 seconds to keep XP/achievements fresh
    refetchInterval: 30000,
  });
}
