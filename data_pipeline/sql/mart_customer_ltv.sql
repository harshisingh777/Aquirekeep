-- mart_customer_ltv.sql
WITH customer_calc AS (
    SELECT
        customer_id,
        acquisition_channel,
        country,
        MIN(order_date) as first_order_date,
        MAX(order_date) as last_order_date,
        COUNT(DISTINCT order_id) as frequency_count,
        SUM(net_amount) as historical_ltv,
        SUM(net_amount) * 1.0 / COUNT(DISTINCT order_id) as aov,
        -- Age of customer in days
        COALESCE(NULLIF(DATE_DIFF('day', CAST(MIN(order_date) AS TIMESTAMP), CAST((SELECT MAX(order_date) FROM stg_orders) AS TIMESTAMP)), 0), 30) as customer_age_days,
        -- Recency in days
        DATE_DIFF('day', CAST(MAX(order_date) AS TIMESTAMP), CAST((SELECT MAX(order_date) FROM stg_orders) AS TIMESTAMP)) as recency_days
    FROM stg_orders
    WHERE status != 'cancelled'
    GROUP BY 1, 2, 3
),
predictions AS (
    SELECT
        customer_id,
        acquisition_channel,
        country,
        historical_ltv,
        aov,
        recency_days,
        CASE
            WHEN recency_days <= 90 THEN (frequency_count * 1.0 / customer_age_days) * 365.0 * 0.8
            WHEN recency_days <= 180 THEN (frequency_count * 1.0 / customer_age_days) * 365.0 * 0.3
            ELSE 0.0
        END as expected_purchases_12mo
    FROM customer_calc
)
SELECT
    customer_id,
    acquisition_channel,
    country,
    ROUND(historical_ltv, 2) as historical_ltv,
    ROUND(historical_ltv + (aov * expected_purchases_12mo), 2) as predicted_ltv_12mo
FROM predictions;
