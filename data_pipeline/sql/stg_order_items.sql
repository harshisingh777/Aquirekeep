-- stg_order_items.sql
SELECT
    oi.order_item_id,
    oi.order_id,
    oi.product_id,
    oi.category,
    oi.quantity,
    oi.unit_price,
    oi.quantity * oi.unit_price as gross_amount,
    o.order_date,
    o.customer_id
FROM raw_order_items oi
JOIN raw_orders o ON oi.order_id = o.order_id;
