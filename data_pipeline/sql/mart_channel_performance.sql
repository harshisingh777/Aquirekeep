-- mart_channel_performance.sql
WITH monthly_spend AS (
    SELECT
        DATE_TRUNC('month', CAST(date AS TIMESTAMP)) as spend_month,
        channel,
        SUM(spend_amount) as total_spend
    FROM raw_marketing_spend
    GROUP BY 1, 2
),
cohort_info AS (
    SELECT
        DATE_TRUNC('month', CAST(c.first_seen_at AS TIMESTAMP)) as cohort_month,
        c.acquisition_channel,
        COUNT(DISTINCT c.customer_id) as cohort_size,
        SUM(ltv.historical_ltv) as total_historical_revenue,
        SUM(ltv.predicted_ltv_12mo) as total_predicted_revenue
    FROM stg_customers c
    JOIN mart_customer_ltv ltv ON c.customer_id = ltv.customer_id
    GROUP BY 1, 2
)
SELECT
    c.cohort_month,
    c.acquisition_channel as channel,
    c.cohort_size,
    COALESCE(s.total_spend, 0.0) as total_spend,
    ROUND(COALESCE(s.total_spend, 0.0) / NULLIF(c.cohort_size, 0), 2) as blended_cac,
    ROUND(c.total_historical_revenue / NULLIF(c.cohort_size, 0), 2) as avg_historical_ltv,
    ROUND(c.total_predicted_revenue / NULLIF(c.cohort_size, 0), 2) as avg_predicted_ltv_12mo,
    ROUND((c.total_historical_revenue / NULLIF(c.cohort_size, 0)) / NULLIF(COALESCE(s.total_spend, 0.0) / NULLIF(c.cohort_size, 0), 0.0), 2) as ltv_to_cac_ratio
FROM cohort_info c
LEFT JOIN monthly_spend s
    ON c.cohort_month = s.spend_month
    AND c.acquisition_channel = s.channel
ORDER BY c.cohort_month, c.acquisition_channel;
