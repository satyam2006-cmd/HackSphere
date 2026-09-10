export type HistoricalPredictedLabel = 0 | 1 | 2;

export interface LeadItem {
  object_id: string;
  lead_id: string;
  name: string;
  account_name: string;
  contact_name: string;
  job_title: string;
  status: string;
  source: string;
  priority: string;
  start_date: string;
  end_date: string;
  sales_unit: string;
  sales_territory: string;
  owner_name: string;
  note: string;
  features: Record<string, number>;
  predicted_label: HistoricalPredictedLabel;
  predicted_class: string;
  conversion_probability: number;
  confidence: number;
  lead_score?: number;
  lead_category?: "Hot" | "Warm" | "Cold";
  confidence_level?: "Very High" | "High" | "Moderate" | "Low";
  primary_driver?: string;
  positive_evidence?: string[];
  negative_evidence?: string[];
  lock_strategy?: string;
  total_visits?: number;
  total_time_on_website?: number;
  page_views_per_visit?: number;
}

export interface LeadListResponse {
  leads: LeadItem[];
  total: number;
}

export interface ModelMetrics {
  accuracy: number;
  confusion_matrix: number[][];
  labels: string[];
  training_rows: number;
}

export type OutreachDraftState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; draft: string }
  | { status: "error"; error?: string };

// ── Conversion Pipeline Types (from XGBoost notebook) ──

export interface ScoredLead {
  sales_rank: number;
  lead_id: string;
  lead_score: number;
  lead_category: "Hot" | "Warm" | "Cold";
  lock_chance_pct: number;
  confidence_level: "Very High" | "High" | "Moderate" | "Low";
  primary_driver: string;
  positive_evidence: string[];
  negative_evidence: string[];
  lock_strategy: string;
  contact_name?: string;
  company?: string;
  job_title?: string;
  predicted_probability: number;
  predicted_converted: number;
  actual_converted: number;
  lead_origin: string;
  lead_source: string;
  last_activity: string;
  country: string;
  specialization: string;
  occupation: string;
  city: string;
  tags: string;
  lead_quality: string;
  total_visits: number;
  total_time_on_website: number;
  page_views_per_visit: number;
}

export interface ScoredLeadListResponse {
  leads: ScoredLead[];
  total: number;
  category_counts?: {
    all: number;
    hot: number;
    warm: number;
    cold: number;
  };
}

export interface PipelineDemoSummary {
  total: number;
  hot_count: number;
  warm_count: number;
  cold_count: number;
  hot_avg_lock_chance: number;
  warm_avg_lock_chance: number;
  cold_avg_lock_chance: number;
}

export interface PipelineDemoResponse {
  status: string;
  pipeline_execution_time_ms: number;
  summary: PipelineDemoSummary;
  leads: ScoredLead[];
}

export interface CleaningReport {
  total_records: number;
  missing_values_imputed: number;
  fields_normalized: number;
  cleaning_steps: string[];
}

export interface InjectedPipelineResponse {
  status: string;
  pipeline_execution_time_ms: number;
  cleaning_report: CleaningReport;
  summary: PipelineDemoSummary;
  leads: ScoredLead[];
}

export interface ConversionMetrics {
  model_name: string;
  version: string;
  training_date: string;
  target_variable: string;
  roc_auc_score: number;
  pr_auc_score: number;
  brier_score: number;
  threshold: number;
  precision: number;
  recall: number;
  f1_score: number;
  hot_threshold: number;
  warm_threshold: number;
  numerical_features: string[];
  categorical_features: string[];
  description: string;
}

export interface PipelineStatus {
  status: "ready" | "unavailable";
  model_name?: string;
  version?: string;
  roc_auc?: number;
  f1_score?: number;
  feature_count?: number;
  error?: string;
}
