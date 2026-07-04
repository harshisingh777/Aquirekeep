import os
import random
import hashlib
from datetime import datetime, timedelta
import pandas as pd
from faker import Faker

fake = Faker()
random.seed(42)

def generate_ecommerce_data(output_dir: str):
    os.makedirs(output_dir, exist_ok=True)
    
    # Configuration
    start_date = datetime(2024, 1, 1)
    end_date = datetime(2025, 12, 31)
    days_range = (end_date - start_date).days
    
    channels = ['Search', 'Paid Social', 'Email', 'Organic', 'Direct']
    countries = ['US', 'BR', 'GB', 'DE', 'FR']
    signup_sources = ['Web', 'iOS', 'Android']
    categories = ['Electronics', 'Apparel', 'Home', 'Beauty', 'Books']
    
    # Retention curves by channel (probability of subsequent purchases at period N months)
    # email is highly retained, paid social is low, organic is steady
    retention_profiles = {
        'Email':       [1.0, 0.45, 0.38, 0.35, 0.32, 0.30, 0.28, 0.27, 0.26, 0.25, 0.24, 0.23, 0.22],
        'Organic':     [1.0, 0.30, 0.25, 0.22, 0.20, 0.19, 0.18, 0.17, 0.16, 0.15, 0.15, 0.14, 0.13],
        'Direct':      [1.0, 0.35, 0.28, 0.25, 0.23, 0.22, 0.20, 0.19, 0.18, 0.17, 0.16, 0.15, 0.14],
        'Search':      [1.0, 0.20, 0.15, 0.12, 0.10, 0.09, 0.08, 0.08, 0.07, 0.07, 0.06, 0.06, 0.05],
        'Paid Social': [1.0, 0.12, 0.08, 0.06, 0.05, 0.04, 0.03, 0.03, 0.02, 0.02, 0.02, 0.01, 0.01]
    }
    
    # 1. Generate Customers
    num_customers = 1500
    customers_data = []
    
    for i in range(1, num_customers + 1):
        cust_id = f"CUST_{i:05d}"
        email = f"user_{i}@example.com"
        email_hash = hashlib.md5(email.encode()).hexdigest()
        
        # Determine customer first appearance
        # Distribute signups across the timeline
        signup_days_offset = random.randint(0, days_range - 90) # Leave at least 90 days for repeat orders
        first_seen_at = start_date + timedelta(days=signup_days_offset)
        
        acquisition_channel = random.choices(channels, weights=[0.3, 0.35, 0.15, 0.1, 0.1], k=1)[0]
        country = random.choices(countries, weights=[0.4, 0.2, 0.15, 0.15, 0.1], k=1)[0]
        signup_source = random.choices(signup_sources, weights=[0.5, 0.3, 0.2], k=1)[0]
        
        customers_data.append({
            'customer_id': cust_id,
            'email_hash': email_hash,
            'first_seen_at': first_seen_at.strftime('%Y-%m-%d %H:%M:%S'),
            'acquisition_channel': acquisition_channel,
            'country': country,
            'signup_source': signup_source
        })
        
    df_customers = pd.DataFrame(customers_data)
    df_customers.to_csv(os.path.join(output_dir, 'customers.csv'), index=False)
    
    # 2. Generate Orders, Order Items, and Refunds
    orders_data = []
    order_items_data = []
    refunds_data = []
    
    order_counter = 1
    item_counter = 1
    refund_counter = 1
    
    for cust in customers_data:
        cust_id = cust['customer_id']
        channel = cust['acquisition_channel']
        first_date = datetime.strptime(cust['first_seen_at'], '%Y-%m-%d %H:%M:%S')
        
        # First order
        num_orders = 1
        orders_dates = [first_date]
        
        # Decide subsequent orders based on channel retention profile
        profile = retention_profiles[channel]
        # Check every month up to 12 months after first purchase
        for month_idx in range(1, 13):
            # Probability of making a purchase in this month
            prob = profile[month_idx]
            # Add some randomness to cohort decay
            if random.random() < prob:
                # Place order in this month
                days_offset = month_idx * 30 + random.randint(-10, 10)
                order_date = first_date + timedelta(days=days_offset)
                if order_date <= end_date:
                    orders_dates.append(order_date)
                    
        # Generate items and prices for each order
        for o_date in orders_dates:
            order_id = f"ORD_{order_counter:06d}"
            order_counter += 1
            
            # Simple order status
            status = random.choices(['completed', 'returned', 'cancelled'], weights=[0.88, 0.08, 0.04], k=1)[0]
            
            # Items in this order
            num_items = random.choices([1, 2, 3, 4], weights=[0.6, 0.25, 0.1, 0.05], k=1)[0]
            order_total = 0.0
            order_discount = 0.0
            
            for _ in range(num_items):
                item_id = f"ITEM_{item_counter:07d}"
                item_counter += 1
                
                category = random.choice(categories)
                product_id = f"PROD_{category[:3].upper()}_{random.randint(100, 999)}"
                quantity = random.choices([1, 2, 3], weights=[0.85, 0.12, 0.03], k=1)[0]
                
                # Base price ranges by category
                price_ranges = {
                    'Electronics': (40.0, 400.0),
                    'Apparel': (15.0, 80.0),
                    'Home': (20.0, 150.0),
                    'Beauty': (10.0, 60.0),
                    'Books': (8.0, 30.0)
                }
                min_p, max_p = price_ranges[category]
                unit_price = round(random.uniform(min_p, max_p), 2)
                
                order_items_data.append({
                    'order_item_id': item_id,
                    'order_id': order_id,
                    'product_id': product_id,
                    'category': category,
                    'quantity': quantity,
                    'unit_price': unit_price
                })
                order_total += unit_price * quantity
            
            # Apply random discount
            if random.random() < 0.3:
                order_discount = round(order_total * random.uniform(0.05, 0.20), 2)
            
            total_amount = round(order_total - order_discount, 2)
            
            orders_data.append({
                'order_id': order_id,
                'customer_id': cust_id,
                'order_date': o_date.strftime('%Y-%m-%d %H:%M:%S'),
                'status': status,
                'total_amount': total_amount,
                'currency': 'USD',
                'discount_amount': order_discount
            })
            
            # If status is returned, generate a refund record
            if status == 'returned':
                refund_date = o_date + timedelta(days=random.randint(1, 14))
                if refund_date <= end_date:
                    refunds_data.append({
                        'refund_id': f"REF_{refund_counter:06d}",
                        'order_id': order_id,
                        'refund_date': refund_date.strftime('%Y-%m-%d %H:%M:%S'),
                        'refund_amount': total_amount
                    })
                    refund_counter += 1

    df_orders = pd.DataFrame(orders_data)
    df_orders.to_csv(os.path.join(output_dir, 'orders.csv'), index=False)
    
    df_items = pd.DataFrame(order_items_data)
    df_items.to_csv(os.path.join(output_dir, 'order_items.csv'), index=False)
    
    df_refunds = pd.DataFrame(refunds_data)
    df_refunds.to_csv(os.path.join(output_dir, 'refunds.csv'), index=False)
    
    # 3. Generate Marketing Spend
    marketing_data = []
    current_date = start_date
    
    # Daily costs by channel
    channel_daily_costs = {
        'Search': (50, 150),
        'Paid Social': (80, 250),
        'Email': (5, 20),
        'Organic': (0, 0),
        'Direct': (0, 0)
    }
    
    while current_date <= end_date:
        for chan in channels:
            min_c, max_c = channel_daily_costs[chan]
            if max_c > 0:
                spend = round(random.uniform(min_c, max_c), 2)
            else:
                spend = 0.0
                
            # Add some seasonal variance (e.g. November / December spends are higher)
            if current_date.month in [11, 12]:
                spend = round(spend * 1.5, 2)
                
            marketing_data.append({
                'date': current_date.strftime('%Y-%m-%d'),
                'channel': chan,
                'spend_amount': spend
            })
        current_date += timedelta(days=1)
        
    df_marketing = pd.DataFrame(marketing_data)
    df_marketing.to_csv(os.path.join(output_dir, 'marketing_spend.csv'), index=False)
    
    print(f"Data generation complete! Saved in {output_dir}")
    print(f"Generated: {len(df_customers)} customers, {len(df_orders)} orders, {len(df_items)} items, {len(df_refunds)} refunds, {len(df_marketing)} marketing rows.")

if __name__ == "__main__":
    generate_ecommerce_data("./raw_data")
