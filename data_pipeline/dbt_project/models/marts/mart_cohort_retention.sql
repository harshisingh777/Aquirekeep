with transactions as (
    select * from {{ ref('stg_transactions') }}
),

cohort_items as (
    select
        customer_id,
        date_trunc('month', min(order_date)) over (partition by customer_id) as cohort_month,
        order_date,
        total_amount
    from transactions
),

retention as (
    select
        cohort_month,
        date_trunc('month', order_date) as order_month,
        count(distinct customer_id) as active_customers,
        sum(total_amount) as revenue
    from cohort_items
    group by 1, 2
)

select
    cohort_month,
    order_month,
    extract(month from age(order_month, cohort_month)) as period_number,
    active_customers,
    revenue,
    first_value(active_customers) over (partition by cohort_month order by order_month asc) as cohort_size,
    round((active_customers::numeric / first_value(active_customers) over (partition by cohort_month order by order_month asc)) * 100, 2) as retention_rate
from retention
order by 1, 2
