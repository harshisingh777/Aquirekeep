// src/constants/index.ts

export const CHANNELS = ['Search', 'Paid Social', 'Email', 'Organic', 'Direct'];
export const COUNTRIES = ['US', 'BR', 'GB', 'DE', 'FR'];

export const METRIC_FORMULAS = [
  {
    name: "Cohort",
    formula: "All customers grouped by their first purchase date (e.g. Month or Week).",
    explanation: "Grouping customers by their acquisition date allows us to track how their behavior evolves over time relative to when they started, rather than looking at aggregate store performance which blends new and old customers."
  },
  {
    name: "Retention Rate (Period N)",
    formula: "(Customers who purchased in Period N / Original Cohort Size) * 100",
    explanation: "Tracks the percentage of customers from a cohort who return to make a purchase exactly N months (or weeks) after their first purchase. An order in a period is defined as placing at least one order of status completed or returned (cancelled orders are excluded)."
  },
  {
    name: "Churn Rate",
    formula: "100 - Retention Rate (Period N) [Cohort-level], or (Customers inactive > 90 days / Total Customers) * 100 [Blended Churn]",
    explanation: "Blended churn represents the percentage of customers who have not placed a completed order in the trailing 90 days. Higher churn means you are failing to keep customers engaged after their first purchase."
  },
  {
    name: "Repeat Purchase Rate",
    formula: "(Customers with >= 2 Orders / Total Customers) * 100",
    explanation: "Measures the fraction of your active customer base that has placed more than one order. A high repeat purchase rate indicates a healthy product-market fit and customer loyalty."
  },
  {
    name: "Customer LTV (Historical)",
    formula: "Sum of Net Revenue per customer to date (Total Spent - Refunds)",
    explanation: "Calculates the total gross margin or net dollar value a customer has contributed to your business to date, subtracting any discounts applied and returned order refunds."
  },
  {
    name: "Customer LTV (Predicted 12mo)",
    formula: "Historical LTV + (AOV * Expected Additional Purchases next 12 Months)",
    explanation: "Predicts the value a customer will bring over the next 12 months. Expected purchases are calculated using a recency-based model: customers active in the last 90 days are projected at 80% of their historical purchase frequency, active in 90-180 days at 30%, and inactive over 180 days at 0% (churned)."
  },
  {
    name: "LTV:CAC Ratio",
    formula: "Average LTV / Blended CAC",
    explanation: "A standard SaaS/E-commerce efficiency metric. A ratio of 3.0x or higher is considered healthy, meaning the customer brings in 3 times what it cost to acquire them. Under 1.0x means you are losing money on every customer."
  }
];
