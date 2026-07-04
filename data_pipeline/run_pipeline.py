import os
import sqlite3
import duckdb
from generate_data import generate_ecommerce_data

def run_analytics_pipeline(db_path: str, sql_dir: str, raw_data_dir: str):
    print("Step 1: Generating synthetic e-commerce data...")
    generate_ecommerce_data(raw_data_dir)
    
    print(f"Step 2: Connecting to DuckDB at {db_path}...")
    # Ensure backend directory exists
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = duckdb.connect(db_path)
    
    print("Step 3: Loading raw CSVs into DuckDB...")
    conn.execute(f"CREATE OR REPLACE TABLE raw_customers AS SELECT * FROM read_csv_auto('{os.path.join(raw_data_dir, 'customers.csv')}')")
    conn.execute(f"CREATE OR REPLACE TABLE raw_orders AS SELECT * FROM read_csv_auto('{os.path.join(raw_data_dir, 'orders.csv')}')")
    conn.execute(f"CREATE OR REPLACE TABLE raw_order_items AS SELECT * FROM read_csv_auto('{os.path.join(raw_data_dir, 'order_items.csv')}')")
    conn.execute(f"CREATE OR REPLACE TABLE raw_refunds AS SELECT * FROM read_csv_auto('{os.path.join(raw_data_dir, 'refunds.csv')}')")
    conn.execute(f"CREATE OR REPLACE TABLE raw_marketing_spend AS SELECT * FROM read_csv_auto('{os.path.join(raw_data_dir, 'marketing_spend.csv')}')")
    
    print("Step 4: Running Staging and Mart Transformations...")
    
    # Order matters because of dependencies!
    sql_files = [
        ('stg_customers', 'stg_customers.sql'),
        ('stg_orders', 'stg_orders.sql'),
        ('stg_order_items', 'stg_order_items.sql'),
        ('mart_customer_rfm', 'mart_customer_rfm.sql'), # needed for ltv
        ('mart_customer_ltv', 'mart_customer_ltv.sql'), # needed for channel performance
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
            
        # Create or replace table from the query
        conn.execute(f"CREATE OR REPLACE TABLE {table_name} AS {query}")
        
    # Verify loaded tables
    print("Step 5: Verifying tables...")
    tables = conn.execute("SHOW TABLES").fetchall()
    print("Created tables in database:")
    for t in tables:
        count = conn.execute(f"SELECT COUNT(*) FROM {t[0]}").fetchone()[0]
        print(f"  - {t[0]}: {count} rows")
        
    conn.close()
    print("Pipeline execution completed successfully!")

if __name__ == "__main__":
    db_file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend/ecommerce.db"))
    sql_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), "./sql"))
    raw_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), "./raw_data"))
    
    run_analytics_pipeline(db_file_path, sql_folder, raw_folder)
