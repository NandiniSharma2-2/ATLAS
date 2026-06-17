// Custom hooks for new ATLAS features
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  analyzeHealthTrends,
  findHealthCorrelations,
  generateRecommendations,
  generateFutureProjection,
  getUserHabits,
  getRecommendations,
  getUserGoals,
} from "@/lib/atlas.functions";

// Health Memory hooks
export function useHealthTrends(days: number = 30) {
  return useQuery({
    queryKey: ["atlas", "health-trends", days],
    queryFn: () => analyzeHealthTrends({ days }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useHealthCorrelations(minCorrelation: number = 0.3) {
  return useQuery({
    queryKey: ["atlas", "health-correlations", minCorrelation],
    queryFn: () => findHealthCorrelations({ min_correlation: minCorrelation }),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useUserHabits() {
  return useQuery({
    queryKey: ["atlas", "user-habits"],
    queryFn: () => getUserHabits(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Future-Me Simulator hooks
export function useFutureProjection(
  projectionType: '30_day' | '6_month' | '1_year',
  scenarios: Array<'best_case' | 'realistic' | 'worst_case'> = ['realistic']
) {
  return useQuery({
    queryKey: ["atlas", "future-projection", projectionType, scenarios],
    queryFn: () => generateFutureProjection({ 
      projection_type: projectionType,
      scenario_types: scenarios 
    }),
    staleTime: 30 * 60 * 1000, // 30 minutes - projections don't change often
  });
}

export function useUserGoals(status?: string) {
  return useQuery({
    queryKey: ["atlas", "user-goals", status],
    queryFn: () => getUserGoals({ status: status as any }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Recommendations hooks
export function useGenerateRecommendations() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: generateRecommendations,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atlas", "recommendations"] });
    }
  });
}

export function useRecommendations(filters?: any) {
  return useQuery({
    queryKey: ["atlas", "recommendations", filters],
    queryFn: () => getRecommendations(filters || {}),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Invalidation helpers
export function useInvalidateAtlasData() {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: ["atlas"] }),
    invalidateHealth: () => queryClient.invalidateQueries({ queryKey: ["atlas", "health-data"] }),
    invalidateInsights: () => queryClient.invalidateQueries({ queryKey: ["atlas", "health-trends"] }),
    invalidateRecommendations: () => queryClient.invalidateQueries({ queryKey: ["atlas", "recommendations"] }),
    invalidateProjections: () => queryClient.invalidateQueries({ queryKey: ["atlas", "future-projection"] }),
  };
}