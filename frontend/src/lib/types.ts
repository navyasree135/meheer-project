export type RiskLevel = 'Minor' | 'Serious' | 'Fatal' | 'Unclassified';
export type ObservationStatus = 'Open' | 'Overdue' | 'In Progress' | 'Closed' | 'Completed';
export type DateMode = 'occurrence' | 'reported';

export interface ActionItem {
  id: number;
  observation_db_id: number;
  observation_id: string;
  action_number: number;
  action_text: string | null;
  status: string;
  due_date: string | null;
  closure_date: string | null;
  remarks: string | null;
}

export interface ObservationItem {
  id: number;
  dataset_id: string;
  seq_no: number | null;
  observation_id: string;
  has_suffix_s: boolean;
  occurrence_date: string;
  occurrence_iso_year: number;
  occurrence_iso_week: number;
  occurrence_week_label: string;
  raw_type: string | null;
  category: string;
  sub_category: string | null;
  detail: string | null;
  description: string | null;
  raw_location: string | null;
  unit: string;
  sub_location: string | null;
  exact_location: string | null;
  reported_on: string | null;
  reported_iso_year: number | null;
  reported_iso_week: number | null;
  reported_week_label: string | null;
  reporting_lag_days: number;
  risk_level: RiskLevel;
  observation_status: string;
  pair_present: boolean;
  closure_date: string | null;
  closed_by: string | null;
  reason_for_no_actions: string | null;
  actions_count: number;
  has_actions: boolean;
  actions?: ActionItem[];
}

export interface DashboardFilters {
  dataset_id?: string;
  start_date?: string;
  end_date?: string;
  units?: string[];
  categories?: string[];
  risk_levels?: string[];
  observation_statuses?: string[];
  pair_present?: boolean;
  date_mode?: DateMode;
  search?: string;
  has_actions?: boolean;
}

export interface SummaryKPIs {
  total_observations: number;
  serious_fatal_count: number;
  serious_fatal_pct: number;
  fatal_count: number;
  serious_count: number;
  minor_count: number;
  unclassified_count: number;
  actions_assigned_count: number;
  actions_assigned_pct: number;
  total_unpivoted_actions: number;
  open_actions_count: number;
  overdue_actions_count: number;
  completed_actions_count: number;
  avg_reporting_lag_days: number;
  pair_present_count: number;
  pair_present_pct: number;
  open_obs_count: number;
  overdue_obs_count: number;
  in_progress_obs_count: number;
}

export interface TrendPoint {
  iso_year: number;
  iso_week: number;
  week_key: string;
  week_label: string;
  count: number | null;
  projected_count?: number | null;
  lower_bound?: number | null;
  upper_bound?: number | null;
  serious_fatal_count?: number;
  wow_pct: number | null;
  is_projection: boolean;
}

export interface TrendResponse {
  date_mode: DateMode;
  historical_points: TrendPoint[];
  forecast_points: TrendPoint[];
  combined_series: TrendPoint[];
  forecast_disclaimer: string;
}

export interface CategoryItem {
  category: string;
  count: number;
  percentage: number;
  fatal_count: number;
  serious_count: number;
  minor_count: number;
  unclassified_count: number;
  serious_fatal_count: number;
}

export interface CategoryDrilldownResponse {
  is_drilldown: boolean;
  category?: string;
  total_in_category?: number;
  sub_categories?: Array<{
    sub_category: string;
    count: number;
    serious_fatal_count: number;
  }>;
  top_details?: Array<{
    sub_category: string;
    detail: string;
    count: number;
    fatal_count: number;
    serious_count: number;
    minor_count: number;
  }>;
  total_observations?: number;
  categories?: CategoryItem[];
}

export interface LocationItem {
  unit: string;
  count: number;
  percentage: number;
  fatal_count: number;
  serious_count: number;
  minor_count: number;
  open_count: number;
  overdue_count: number;
  risk_score: number;
}

export interface LocationDrilldownResponse {
  is_drilldown: boolean;
  unit?: string;
  total_in_unit?: number;
  sub_locations?: Array<{
    sub_location: string;
    count: number;
    percentage: number;
    serious_fatal_count: number;
    open_count: number;
  }>;
  exact_locations?: Array<{
    sub_location: string;
    exact_location: string;
    count: number;
  }>;
  total_observations?: number;
  units?: LocationItem[];
}

export interface ActionsAnalysisResponse {
  total_observations: number;
  observations_with_actions: number;
  observations_without_actions: number;
  with_actions_pct: number;
  without_actions_pct: number;
  total_actions_logged: number;
  action_status_distribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  action_sequence_distribution: Array<{
    action_number: number;
    label: string;
    count: number;
  }>;
  top_reasons_no_actions: Array<{
    reason: string;
    count: number;
  }>;
}

export interface RepeatCluster {
  id: string;
  unit: string;
  category: string;
  sub_category: string;
  detail: string;
  repeat_count: number;
  fatal_count: number;
  serious_count: number;
  minor_count: number;
  first_seen: string | null;
  last_seen: string | null;
  priority_score: number;
  recurrence_severity: 'Critical' | 'High' | 'Moderate';
}

export interface RepeatsResponse {
  total_repeat_clusters: number;
  total_repeated_observations: number;
  repeated_obs_percentage: number;
  clusters: RepeatCluster[];
  detection_rule: string;
}

export interface SeverityCluster {
  name: string;
  type: string;
  total_observations: number;
  fatal_count: number;
  serious_count: number;
  minor_count: number;
  unclassified_count?: number;
  serious_fatal_count: number;
  serious_fatal_pct: number;
  severity_index: number;
}

export interface SeverityResponse {
  top_5_high_severity_units: SeverityCluster[];
  bottom_5_low_severity_units: SeverityCluster[];
  top_5_high_severity_categories: SeverityCluster[];
  bottom_5_low_severity_categories: SeverityCluster[];
  scoring_methodology: string;
}

export interface FilterOptions {
  units: string[];
  categories: string[];
  risk_levels: string[];
  statuses: string[];
  min_date: string;
  max_date: string;
}

export interface DatasetItem {
  id: string;
  filename: string;
  file_size_bytes: number | null;
  row_count: number;
  s3_key: string | null;
  is_active: boolean;
  status: string;
  uploaded_at: string | null;
  completed_at: string | null;
}

export interface JobStatusResponse {
  job_id: string;
  stage: string;
  processed_count: number;
  total_count: number;
  percent: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  error: string | null;
}
