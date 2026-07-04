-- stg_orders.sql
SELECT
    o.order_id,
    o.customer_id,
    CAST(o.order_date AS TIMESTAMP) as order_date,
    o.status,
    o.total_amount,
    o.currency,
    o.discount_amount,
    COALESCE(r.refund_amount, 0.0) as refund_amount,
    o.total_amount - COALESCE(r.refund_amount, 0.0) as net_amount,
    c.acquisition_channel,
    c.country,
    c.signup_source
FROM raw_orders o
LEFT JOIN raw_customers c ON o.customer_id = c.customer_id
LEFT JOIN raw_refunds r ON o.order_id = r.order_id;
