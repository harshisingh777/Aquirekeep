-- mart_customer_rfm.sql
WITH customer_stats AS (
    SELECT
        customer_id,
        -- Reference date is the max order date in the dataset
        DATE_DIFF('day', CAST(MAX(order_date) AS TIMESTAMP), CAST((SELECT MAX(order_date) FROM stg_orders) AS TIMESTAMP)) as recency_days,
        COUNT(DISTINCT order_id) as frequency_count,
        SUM(net_amount) as monetary_total
    from stg_orders
    WHERE status != 'cancelled'
    GROUP BY 1
),
rfm_scores AS (
    SELECT
        customer_id,
        recency_days,
        frequency_count,
        monetary_total,
        -- R score: 5 is most recent (lowest recency_days)
        NTILE(5) OVER (ORDER BY recency_days DESC) as r_score,
        -- F score: 5 is highest frequency
        NTILE(5) OVER (ORDER BY frequency_count ASC) as f_score,
        -- M score: 5 is highest monetary
        NTILE(5) OVER (ORDER BY monetary_total ASC) as m_score
    FROM customer_stats
)
SELECT
    customer_id,
    recency_days,
    frequency_count,
    monetary_total,
    r_score,
    f_score,
    m_score,
    r_score || f_score || m_score as rfm_cell,
    CASE
        WHEN r_score >= 4 AND f_score >= 4 THEN 'Champions'
        WHEN r_score >= 3 AND f_score >= 3 THEN 'Loyal Customers'
        WHEN r_score >= 4 AND f_score = 1 THEN 'Recent Customers'
        WHEN r_score >= 3 AND f_score >= 1 AND r_score <= 4 AND f_score <= 2 THEN 'Customers Needing Attention'
        WHEN r_score <= 2 AND f_score >= 3 THEN 'At Risk'
        WHEN r_score <= 2 AND f_score <= 2 THEN 'Lost'
        ELSE 'About to Sleep'
    END as rfm_segment
FROM rfm_scores;
