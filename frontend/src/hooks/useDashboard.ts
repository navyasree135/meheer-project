import { useQuery } from '@tanstack/react-query';
import {
  fetchSummaryKPIs,
  fetchTrend,
  fetchCategories,
  fetchLocations,
  fetchActionsAnalysis,
  fetchRepeats,
  fetchSeverity,
  fetchFilterOptions,
  fetchDatasets,
  fetchObservations,
} from '../lib/api';
import { DashboardFilters } from '../lib/types';

export function useSummaryKPIs(filters?: DashboardFilters) {
  return useQuery({
    queryKey: ['summaryKPIs', filters],
    queryFn: () => fetchSummaryKPIs(filters),
    staleTime: 60 * 1000,
  });
}

export function useTrend(filters?: DashboardFilters) {
  return useQuery({
    queryKey: ['trend', filters],
    queryFn: () => fetchTrend(filters),
    staleTime: 60 * 1000,
  });
}

export function useCategories(filters?: DashboardFilters, drillCategory?: string) {
  return useQuery({
    queryKey: ['categories', filters, drillCategory],
    queryFn: () => fetchCategories(filters, drillCategory),
    staleTime: 60 * 1000,
  });
}

export function useLocations(filters?: DashboardFilters, drillUnit?: string) {
  return useQuery({
    queryKey: ['locations', filters, drillUnit],
    queryFn: () => fetchLocations(filters, drillUnit),
    staleTime: 60 * 1000,
  });
}

export function useActionsAnalysis(filters?: DashboardFilters) {
  return useQuery({
    queryKey: ['actionsAnalysis', filters],
    queryFn: () => fetchActionsAnalysis(filters),
    staleTime: 60 * 1000,
  });
}

export function useRepeats(filters?: DashboardFilters) {
  return useQuery({
    queryKey: ['repeats', filters],
    queryFn: () => fetchRepeats(filters),
    staleTime: 60 * 1000,
  });
}

export function useSeverity(filters?: DashboardFilters) {
  return useQuery({
    queryKey: ['severity', filters],
    queryFn: () => fetchSeverity(filters),
    staleTime: 60 * 1000,
  });
}

export function useFilterOptions(datasetId?: string) {
  return useQuery({
    queryKey: ['filterOptions', datasetId],
    queryFn: () => fetchFilterOptions(datasetId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDatasets() {
  return useQuery({
    queryKey: ['datasets'],
    queryFn: fetchDatasets,
    staleTime: 30 * 1000,
  });
}

export function useObservations(
  filters?: DashboardFilters,
  page = 1,
  pageSize = 20,
  sortBy = 'occurrence_date',
  sortOrder = 'desc'
) {
  return useQuery({
    queryKey: ['observations', filters, page, pageSize, sortBy, sortOrder],
    queryFn: () => fetchObservations(filters, page, pageSize, sortBy, sortOrder),
    staleTime: 30 * 1000,
  });
}
