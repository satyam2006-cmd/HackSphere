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
}

export interface LeadListResponse {
  leads: LeadItem[];
  total: number;
}

export type OutreachDraftState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; draft: string }
  | { status: "error"; error?: string };
