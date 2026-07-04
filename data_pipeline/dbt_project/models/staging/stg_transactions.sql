with source as (
    select * from {{ source('public', 'raw_transactions') }}
),

renamed as (
    select
        customer_id::varchar as customer_id,
        order_id::varchar as order_id,
        cast(order_date as timestamp) as order_date,
        cast(total_amount as numeric) as total_amount
    from source
)

select * from renamed
