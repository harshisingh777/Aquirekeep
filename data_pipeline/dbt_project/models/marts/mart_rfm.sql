with transactions as (
    select * from {{ ref('stg_transactions') }}
),

customer_metrics as (
    select
        customer_id,
        max(order_date) as last_order_date,
        count(distinct order_id) as frequency,
        sum(total_amount) as monetary
    from transactions
    group by 1
),

rfm_calc as (
    select
        customer_id,
        extract(day from (now() - last_order_date)) as recency_days,
        frequency,
        monetary,
        ntile(5) over (order by extract(day from (now() - last_order_date)) desc) as r_score,
        ntile(5) over (order by frequency asc) as f_score,
        ntile(5) over (order by monetary asc) as m_score
    from customer_metrics
)

select
    customer_id,
    recency_days,
    frequency,
    monetary,
    r_score,
    f_score,
    m_score,
    r_score + f_score + m_score as rfm_score,
    case
        when r_score >= 4 and f_score >= 4 and m_score >= 4 then 'Champion'
        when r_score >= 3 and f_score >= 3 then 'Loyal'
        when r_score <= 2 and f_score >= 3 then 'At Risk'
        when r_score <= 2 and f_score <= 2 then 'Lost'
        else 'Average'
    end as segment
from rfm_calc
