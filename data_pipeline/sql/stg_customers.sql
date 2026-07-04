-- stg_customers.sql
SELECT
    customer_id,
    email_hash,
    CAST(first_seen_at AS TIMESTAMP) as first_seen_at,
    acquisition_channel,
    country,
    signup_source
FROM raw_customers;
