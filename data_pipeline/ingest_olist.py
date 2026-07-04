import os
import duckdb

def run_olist_pipeline(db_path: str, sql_dir: str, archive_dir: str):
    print(f"Connecting to DuckDB at {db_path}...")
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = duckdb.connect(db_path)
    
    # Path conversions to handle backslashes nicely in SQL
    archive_dir_sql = archive_dir.replace('\\', '/')
    customers_csv = f"{archive_dir_sql}/olist_customers_dataset.csv"
    orders_csv = f"{archive_dir_sql}/olist_orders_dataset.csv"
    payments_csv = f"{archive_dir_sql}/olist_order_payments_dataset.csv"
    items_csv = f"{archive_dir_sql}/olist_order_items_dataset.csv"
    products_csv = f"{archive_dir_sql}/olist_products_dataset.csv"

    print("Loading Olist data into raw tables...")

    # raw_customers
    conn.execute(f"""
        CREATE OR REPLACE TABLE raw_customers AS
        SELECT
            c.customer_id,
            c.customer_unique_id AS email_hash,
            COALESCE(o.first_seen_at, '2017-01-01'::TIMESTAMP) AS first_seen_at,
            CASE abs(hash(c.customer_id)) % 4
                WHEN 0 THEN 'Organic'
                WHEN 1 THEN 'Paid Social'
                WHEN 2 THEN 'Search'
                ELSE 'Affiliate'
            END AS acquisition_channel,
            c.customer_state AS country,
            'Web' AS signup_source
        FROM read_csv_auto('{customers_csv}') c
        LEFT JOIN (
            SELECT customer_id, MIN(order_purchase_timestamp) AS first_seen_at
            FROM read_csv_auto('{orders_csv}')
            GROUP BY customer_id
        ) o ON c.customer_id = o.customer_id
    """)

    # raw_orders
    conn.execute(f"""
        CREATE OR REPLACE TABLE raw_orders AS
        SELECT
            o.order_id,
            o.customer_id,
            o.order_purchase_timestamp AS order_date,
            CASE
                WHEN o.order_status IN ('canceled', 'unavailable') THEN 'returned'
                ELSE 'completed'
            END AS status,
            COALESCE(p.total_amount, 0) AS total_amount,
            'BRL' AS currency,
            0.0 AS discount_amount
        FROM read_csv_auto('{orders_csv}') o
        LEFT JOIN (
            SELECT order_id, SUM(payment_value) AS total_amount
            FROM read_csv_auto('{payments_csv}')
            GROUP BY order_id
        ) p ON o.order_id = p.order_id
    """)

    # raw_order_items
    conn.execute(f"""
        CREATE OR REPLACE TABLE raw_order_items AS
        SELECT
            oi.order_id || '_' || oi.order_item_id AS order_item_id,
            oi.order_id,
            oi.product_id,
            COALESCE(p.product_category_name, 'unknown') AS category,
            1 AS quantity,
            oi.price AS unit_price
        FROM read_csv_auto('{items_csv}') oi
        LEFT JOIN read_csv_auto('{products_csv}') p ON oi.product_id = p.product_id
    """)

    # raw_refunds
    conn.execute(f"""
        CREATE OR REPLACE TABLE raw_refunds AS
        SELECT
            o.order_id || '_refund' AS refund_id,
            o.order_id,
            CAST(o.order_purchase_timestamp AS DATE) + INTERVAL 5 DAY AS refund_date,
            COALESCE(p.total_amount, 0) AS refund_amount
        FROM read_csv_auto('{orders_csv}') o
        LEFT JOIN (
            SELECT order_id, SUM(payment_value) AS total_amount
            FROM read_csv_auto('{payments_csv}')
            GROUP BY order_id
        ) p ON o.order_id = p.order_id
        WHERE o.order_status IN ('canceled', 'unavailable')
    """)

    # raw_marketing_spend
    conn.execute(f"""
        CREATE OR REPLACE TABLE raw_marketing_spend AS
        WITH RECURSIVE dates AS (
            SELECT CAST('2016-09-01' AS DATE) AS date
            UNION ALL
            SELECT date + INTERVAL 1 MONTH
            FROM dates
            WHERE date < CAST('2018-10-01' AS DATE)
        )
        SELECT
            date,
            channel.channel,
            CASE channel.channel
                WHEN 'Organic' THEN 500.0
                WHEN 'Paid Social' THEN 5000.0
                WHEN 'Search' THEN 3000.0
                WHEN 'Affiliate' THEN 2000.0
            END + (random() * 1000) AS spend_amount
        FROM dates
        CROSS JOIN (SELECT unnest(['Organic', 'Paid Social', 'Search', 'Affiliate']) AS channel) channel
    """)

    print("Running Staging and Mart Transformations...")
    sql_files = [
        ('stg_customers', 'stg_customers.sql'),
        ('stg_orders', 'stg_orders.sql'),
        ('stg_order_items', 'stg_order_items.sql'),
        ('mart_customer_rfm', 'mart_customer_rfm.sql'),
        ('mart_customer_ltv', 'mart_customer_ltv.sql'),
        ('mart_cohort_retention_monthly', 'mart_cohort_retention_monthly.sql'),
        ('mart_cohort_retention_weekly', 'mart_cohort_retention_weekly.sql'),
        ('mart_channel_performance', 'mart_channel_performance.sql')
    ]
    
    for table_name, file_name in sql_files:
        file_path = os.path.join(sql_dir, file_name)
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"SQL file not found: {file_path}")
            
        print(f"  Executing {file_name} -> creating table {table_name}...")
        with open(file_path, 'r') as f:
            query = f.read()
            
        conn.execute(f"CREATE OR REPLACE TABLE {table_name} AS {query}")
        
    print("Verifying tables...")
    tables = conn.execute("SHOW TABLES").fetchall()
    for t in tables:
        count = conn.execute(f"SELECT COUNT(*) FROM {t[0]}").fetchone()[0]
        print(f"  - {t[0]}: {count} rows")
        
    conn.close()
    print("Olist Pipeline execution completed successfully!")

if __name__ == "__main__":
    db_file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend/ecommerce.db"))
    sql_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), "./sql"))
    archive_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), "../archive (2)"))
    
    run_olist_pipeline(db_file_path, sql_folder, archive_folder)
