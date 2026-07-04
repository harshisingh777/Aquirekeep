-- mart_cohort_retention_weekly.sql
WITH customer_cohorts AS (
    SELECT
        o.customer_id,
        MIN(o.order_date) as first_order_date,
        DATE_TRUNC('week', MIN(o.order_date)) as cohort_week,
        c.acquisition_channel,
        c.country
    FROM raw_orders o
    JOIN raw_customers c ON o.customer_id = c.customer_id
    WHERE o.status != 'cancelled'
    GROUP BY o.customer_id, c.acquisition_channel, c.country
),
activity AS (
    SELECT
        o.customer_id,
        DATE_TRUNC('week', o.order_date) as activity_week
    FROM raw_orders o
    WHERE o.status != 'cancelled'
    GROUP BY 1, 2
),
joined_activity AS (
    SELECT
        cc.customer_id,
        cc.cohort_week,
        cc.acquisition_channel,
        cc.country,
        a.activity_week,
        DATE_DIFF('week', cc.cohort_week, a.activity_week) as period_number
    FROM activity a
    JOIN customer_cohorts cc ON a.customer_id = cc.customer_id
),
cohort_sizes AS (
    SELECT
        cohort_week,
        acquisition_channel,
        country,
        COUNT(DISTINCT customer_id) as cohort_size
    FROM customer_cohorts
    GROUP BY 1, 2, 3
),
active_customers_count AS (
    SELECT
        cohort_week,
        acquisition_channel,
        country,
        period_number,
        COUNT(DISTINCT customer_id) as active_customers
    FROM joined_activity
    GROUP BY 1, 2, 3, 4
)
SELECT
    acc.cohort_week,
    acc.period_number,
    acc.acquisition_channel,
    acc.country,
    cs.cohort_size,
    acc.active_customers
FROM active_customers_count acc
JOIN cohort_sizes cs
    ON acc.cohort_week = cs.cohort_week
    AND acc.acquisition_channel = cs.acquisition_channel
    AND acc.country = cs.country;
