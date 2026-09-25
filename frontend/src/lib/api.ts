import axios from 'axios';
import {
  DashboardFilters,
  SummaryKPIs,
  TrendResponse,
  CategoryDrilldownResponse,
  LocationDrilldownResponse,
  ActionsAnalysisResponse,
  RepeatsResponse,
  SeverityResponse,
  FilterOptions,
  DatasetItem,
  JobStatusResponse,
  ObservationItem,
} from './types';

const api = axios.create({
  baseURL: '/api',
});

function serializeFilters(filters?: DashboardFilters): Record<string, any> {
  if (!filters) return {};
  const params: Record<string, any> = {};
  if (filters.dataset_id) params.dataset_id = filters.dataset_id;
  if (filters.start_date) params.start_date = filters.start_date;
  if (filters.end_date) params.end_date = filters.end_date;
  if (filters.units && filters.units.length > 0) params.units = filters.units;
  if (filters.categories && filters.categories.length > 0) params.categories = filters.categories;
  if (filters.risk_levels && filters.risk_levels.length > 0) params.risk_levels = filters.risk_levels;
  if (filters.observation_statuses && filters.observation_statuses.length > 0) params.observation_statuses = filters.observation_statuses;
  if (filters.pair_present !== undefined) params.pair_present = filters.pair_present;
  if (filters.date_mode) params.date_mode = filters.date_mode;
  if (filters.search) params.search = filters.search;
  if (filters.has_actions !== undefined) params.has_actions = filters.has_actions;
  return params;
}

export const fetchSummaryKPIs = async (filters?: DashboardFilters): Promise<SummaryKPIs> => {
  const { data } = await api.get<SummaryKPIs>('/dashboard/summary', {
    params: serializeFilters(filters),
  });
  return data;
};

export const fetchTrend = async (filters?: DashboardFilters): Promise<TrendResponse> => {
  const { data } = await api.get<TrendResponse>('/dashboard/trend', {
    params: serializeFilters(filters),
  });
  return data;
};

export const fetchCategories = async (
  filters?: DashboardFilters,
  drillCategory?: string
): Promise<CategoryDrilldownResponse> => {
  const params = serializeFilters(filters);
  if (drillCategory) params.drill_category = drillCategory;
  const { data } = await api.get<CategoryDrilldownResponse>('/dashboard/categories', { params });
  return data;
};

export const fetchLocations = async (
  filters?: DashboardFilters,
  drillUnit?: string
): Promise<LocationDrilldownResponse> => {
  const params = serializeFilters(filters);
  if (drillUnit) params.drill_unit = drillUnit;
  const { data } = await api.get<LocationDrilldownResponse>('/dashboard/locations', { params });
  return data;
};

export const fetchActionsAnalysis = async (
  filters?: DashboardFilters
): Promise<ActionsAnalysisResponse> => {
  const { data } = await api.get<ActionsAnalysisResponse>('/dashboard/actions', {
    params: serializeFilters(filters),
  });
  return data;
};

export const fetchRepeats = async (filters?: DashboardFilters): Promise<RepeatsResponse> => {
  const { data } = await api.get<RepeatsResponse>('/dashboard/repeats', {
    params: serializeFilters(filters),
  });
  return data;
};

export const fetchSeverity = async (filters?: DashboardFilters): Promise<SeverityResponse> => {
  const { data } = await api.get<SeverityResponse>('/dashboard/severity', {
    params: serializeFilters(filters),
  });
  return data;
};

export const fetchFilterOptions = async (datasetId?: string): Promise<FilterOptions> => {
  const { data } = await api.get<FilterOptions>('/dashboard/filter-options', {
    params: datasetId ? { dataset_id: datasetId } : {},
  });
  return data;
};

export const fetchObservations = async (
  filters?: DashboardFilters,
  page = 1,
  pageSize = 20,
  sortBy = 'occurrence_date',
  sortOrder = 'desc'
): Promise<{ total: number; page: number; page_size: number; total_pages: number; items: ObservationItem[] }> => {
  const params = {
    ...serializeFilters(filters),
    page,
    page_size: pageSize,
    sort_by: sortBy,
    sort_order: sortOrder,
  };
  const { data } = await api.get('/observations', { params });
  return data;
};

export const fetchObservationDetail = async (id: number): Promise<ObservationItem> => {
  const { data } = await api.get<ObservationItem>(`/observations/${id}`);
  return data;
};

export const fetchDatasets = async (): Promise<DatasetItem[]> => {
  const { data } = await api.get<DatasetItem[]>('/datasets');
  return data;
};

export const activateDataset = async (datasetId: string): Promise<any> => {
  const { data } = await api.post(`/datasets/${datasetId}/activate`);
  return data;
};

export const seedSampleData = async (): Promise<{ success: boolean; job_id: string; dataset_id: string }> => {
  const { data } = await api.post('/seed-sample');
  return data;
};

export const uploadObservationsFile = async (
  file: File,
  onUploadProgress?: (progressEvent: any) => void
): Promise<{ success: boolean; job_id: string; dataset_id: string; filename: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
  return data;
};

export const fetchJobStatus = async (jobId: string): Promise<JobStatusResponse> => {
  const { data } = await api.get<JobStatusResponse>(`/jobs/${jobId}`);
  return data;
};
