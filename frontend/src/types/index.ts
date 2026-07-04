// src/types/index.ts

export interface KPIs {
  active_customers: number;
  repeat_purchase_rate: number;
  blended_churn_rate: number;
  average_ltv: number;
}

export interface CohortRetentionRecord {
  cohort: string;
  period: number;
  cohort_size: number;
  active_customers: number;
  retention_rate: number;
}

export interface RFMSegmentRecord {
  segment: string;
  count: number;
  avg_recency_days: number;
  avg_frequency_count: number;
  avg_monetary_value: number;
}

export interface RFMCustomerRecord {
  customer_id: string;
  channel: string;
  country: string;
  recency_days: number;
  frequency_count: number;
  monetary_total: number;
  segment: string;
}

export interface RFMResponse {
  segments: RFMSegmentRecord[];
  customers: RFMCustomerRecord[];
}

export interface ChannelPerformanceRecord {
  cohort_month: string;
  channel: string;
  cohort_size: number;
  total_spend: number;
  blended_cac: number;
  avg_historical_ltv: number;
  avg_predicted_ltv_12mo: number;
  ltv_to_cac_ratio: number;
}
