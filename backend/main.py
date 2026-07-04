import os
import subprocess
import secrets
import hashlib
from datetime import datetime, timedelta
from fastapi import FastAPI, Query, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
import duckdb
from sqlalchemy import create_engine, text
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pandas as pd

# Load .env file if present
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=True)
except ImportError:
    pass  # python-dotenv is optional

# ── JWT (simple HMAC-SHA256 implementation, no extra deps) ──────────────────
import json, base64, hmac

SECRET_KEY = os.environ.get("JWT_SECRET", "retentionanalytics_secret_2024_xk9")
JWT_EXPIRE_HOURS = 24

def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def create_jwt(payload: dict) -> str:
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload["exp"] = (datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)).isoformat()
    body = _b64url(json.dumps(payload).encode())
    sig = _b64url(hmac.new(SECRET_KEY.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest())
    return f"{header}.{body}.{sig}"

def verify_jwt(token: str) -> dict:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("bad token")
        header, body, sig = parts
        expected_sig = _b64url(hmac.new(SECRET_KEY.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest())
        if not secrets.compare_digest(sig, expected_sig):
            raise ValueError("signature mismatch")
        payload = json.loads(base64.urlsafe_b64decode(body + "=="))
        if datetime.fromisoformat(payload["exp"]) < datetime.utcnow():
            raise ValueError("expired")
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

# ── Demo credentials ─────────────────────────────────────────────────────────
DEMO_USERS = {
    "admin@demo.com":  {"password": "admin123",  "role": "admin"},
    "viewer@demo.com": {"password": "viewer123", "role": "viewer"},
}

# ── Pydantic models ──────────────────────────────────────────────────────────
class IngestRequest(BaseModel):
    transactions: List[Dict[str, Any]]

class LoginRequest(BaseModel):
    email: str
    password: str

# ── Define Postgres connection (kept for ingest endpoint) ────────────────────
DATABASE_URL = "postgresql+psycopg://admin:password123@localhost:5432/ecommerce_db"
engine = create_engine(DATABASE_URL)

app = FastAPI(title="E-Commerce Retention API", version="2.0.0")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "ecommerce.db"))

def get_db_conn():
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=500, detail="Database file not found. Please run pipeline first.")
    return duckdb.connect(DB_PATH, read_only=True)

# ── JWT dependency ────────────────────────────────────────────────────────────
def get_current_user(authorization: Optional[str] = Header(None)):
    """Extract & verify JWT from Authorization: Bearer <token> header."""
    if not authorization or not authorization.startswith("Bearer "):
        return {"role": "viewer"}  # fallback for backward compatibility
    token = authorization.split(" ", 1)[1]
    return verify_jwt(token)

def verify_role(current_user: dict = Depends(get_current_user)):
    return current_user.get("role", "viewer")

# Helper to construct filter clauses
def build_filter_clause(channel: Optional[str] = None, country: Optional[str] = None,
                        start_date: Optional[str] = None, end_date: Optional[str] = None,
                        table_prefix: str = "o"):
    clauses = []
    params = {}

    if channel:
        channels_list = [c.strip() for c in channel.split(",") if c.strip()]
        if channels_list:
            placeholders = ", ".join([f"'{c}'" for c in channels_list])
            clauses.append(f"{table_prefix}.acquisition_channel IN ({placeholders})")

    if country:
        countries_list = [c.strip() for c in country.split(",") if c.strip()]
        if countries_list:
            placeholders = ", ".join([f"'{c}'" for c in countries_list])
            clauses.append(f"{table_prefix}.country IN ({placeholders})")

    if start_date:
        clauses.append(f"{table_prefix}.order_date >= CAST(:start_date AS TIMESTAMP)")
        params["start_date"] = start_date

    if end_date:
        clauses.append(f"{table_prefix}.order_date <= CAST(:end_date AS TIMESTAMP)")
        params["end_date"] = end_date

    where_clause = " AND ".join(clauses)
    if where_clause:
        where_clause = "AND " + where_clause

    return where_clause, params


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/auth/login")
def login(req: LoginRequest):
    """JWT login — returns access_token."""
    user = DEMO_USERS.get(req.email)
    if not user or user["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_jwt({"sub": req.email, "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "email": req.email,
    }

@app.get("/api/auth/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@app.get("/api/auth/google")
def google_oauth_redirect():
    """
    Step 1 of Google OAuth 2.0 Authorization Code Flow.
    Redirects the browser to Google's login/consent screen.
    Requires GOOGLE_CLIENT_ID in environment / .env
    """
    from fastapi.responses import RedirectResponse
    from urllib.parse import urlencode

    client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
    redirect_uri = os.environ.get(
        "GOOGLE_REDIRECT_URI", "http://127.0.0.1:8000/api/auth/google/callback"
    )

    if not client_id or client_id == "your_google_client_id_here":
        # Credentials not configured — show a helpful HTML error instead of JSON
        from fastapi.responses import HTMLResponse
        return HTMLResponse(
            content="""
            <html><head><title>OAuth Not Configured</title>
            <style>
              body{font-family:system-ui,sans-serif;max-width:540px;margin:80px auto;padding:20px;
                   background:#0f172a;color:#f1f5f9}
              h2{color:#ef4444;margin-bottom:8px}
              pre{background:#1e293b;padding:16px;border-radius:8px;font-size:13px;overflow-x:auto}
              a{color:#6366f1;text-decoration:none}
            </style></head>
            <body>
              <h2>⚠ Google OAuth Not Configured</h2>
              <p>Add your Google credentials to <code>backend/.env</code>:</p>
              <pre>GOOGLE_CLIENT_ID=your_client_id_from_console
GOOGLE_CLIENT_SECRET=your_client_secret_from_console
GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/api/auth/google/callback</pre>
              <p>Get credentials at: <a href="https://console.cloud.google.com/apis/credentials"
                 target="_blank">Google Cloud Console → APIs & Services → Credentials</a></p>
              <p>Authorised redirect URI to add: <code>http://127.0.0.1:8000/api/auth/google/callback</code></p>
              <br/><a href="http://localhost:3000/login">← Back to login</a>
            </body></html>
            """,
            status_code=200,
        )

    params = {
        "client_id":     client_id,
        "redirect_uri":  redirect_uri,
        "response_type": "code",
        "scope":         "openid email profile",
        "access_type":   "offline",
        "prompt":        "select_account",
    }
    google_auth_url = "https://accounts.google.com/o/oauth2/auth?" + urlencode(params)
    return RedirectResponse(url=google_auth_url)


@app.get("/api/auth/google/callback")
def google_oauth_callback(code: Optional[str] = None, error: Optional[str] = None):
    """
    Step 2 — Google redirects back here with ?code=...
    Exchanges the code for an access token, fetches user profile,
    creates a JWT, then redirects the browser to the frontend.
    """
    from fastapi.responses import RedirectResponse
    import urllib.request

    FRONTEND_CALLBACK = "http://localhost:3000/auth/callback"

    if error or not code:
        return RedirectResponse(
            url=f"{FRONTEND_CALLBACK}?error={error or 'no_code'}"
        )

    client_id     = os.environ.get("GOOGLE_CLIENT_ID", "")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    redirect_uri  = os.environ.get(
        "GOOGLE_REDIRECT_URI", "http://127.0.0.1:8000/api/auth/google/callback"
    )

    # Exchange authorization code for tokens
    token_data = {
        "code":          code,
        "client_id":     client_id,
        "client_secret": client_secret,
        "redirect_uri":  redirect_uri,
        "grant_type":    "authorization_code",
    }

    try:
        import json as _json
        from urllib.parse import urlencode as _urlencode
        from urllib.request import urlopen, Request as _Req

        # Token exchange
        req = _Req(
            "https://oauth2.googleapis.com/token",
            data=_urlencode(token_data).encode(),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        with urlopen(req, timeout=10) as resp:
            token_resp = _json.loads(resp.read())

        access_token = token_resp.get("access_token")
        if not access_token:
            raise ValueError("No access_token in response")

        # Get user profile
        info_req = _Req(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        with urlopen(info_req, timeout=10) as resp:
            user_info = _json.loads(resp.read())

        email = user_info.get("email", "")

        # Determine role: known admin emails get admin; everyone else gets viewer
        admin_emails = [e for e in DEMO_USERS if DEMO_USERS[e]["role"] == "admin"]
        role = "admin" if email in admin_emails else "viewer"

        jwt_token = create_jwt({"sub": email, "role": role, "provider": "google"})

        return RedirectResponse(
            url=f"{FRONTEND_CALLBACK}?token={jwt_token}&role={role}&email={email}"
        )

    except Exception as exc:
        import urllib.parse
        return RedirectResponse(
            url=f"{FRONTEND_CALLBACK}?error={urllib.parse.quote(str(exc))}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# FILTER OPTIONS — returns dynamic values from the actual dataset
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/filter-options")
def get_filter_options():
    """Returns distinct channels and countries present in the active dataset."""
    conn = get_db_conn()
    try:
        channels = [r[0] for r in conn.execute(
            "SELECT DISTINCT acquisition_channel FROM stg_customers ORDER BY acquisition_channel"
        ).fetchall()]
        countries = [r[0] for r in conn.execute(
            "SELECT DISTINCT country FROM stg_customers ORDER BY country"
        ).fetchall()]
        date_range = conn.execute(
            "SELECT MIN(order_date)::VARCHAR, MAX(order_date)::VARCHAR FROM stg_orders WHERE status != 'cancelled'"
        ).fetchone()
        return {
            "channels": channels,
            "countries": countries,
            "date_range": {"min": date_range[0], "max": date_range[1]} if date_range else None,
        }
    finally:
        conn.close()


# ═══════════════════════════════════════════════════════════════════════════════
# ANALYTICS ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/kpis")
def get_kpis(
    channel: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    conn = get_db_conn()
    try:
        where_clause, params = build_filter_clause(channel, country, start_date, end_date, "o")

        cust_query = f"""
            SELECT COUNT(DISTINCT o.customer_id)
            FROM stg_orders o
            WHERE o.status != 'cancelled' {where_clause}
        """
        active_customers = conn.execute(cust_query, params).fetchone()[0] or 0

        if active_customers == 0:
            return {
                "active_customers": 0,
                "repeat_purchase_rate": 0.0,
                "blended_churn_rate": 0.0,
                "average_ltv": 0.0
            }

        repeat_query = f"""
            WITH order_counts AS (
                SELECT o.customer_id, COUNT(DISTINCT o.order_id) as orders
                FROM stg_orders o
                WHERE o.status != 'cancelled' {where_clause}
                GROUP BY 1
            )
            SELECT
                ROUND(COUNT(CASE WHEN orders >= 2 THEN 1 END) * 100.0 / COUNT(*), 2)
            FROM order_counts
        """
        repeat_rate = conn.execute(repeat_query, params).fetchone()[0] or 0.0

        ltv_query = f"""
            WITH customer_ltv AS (
                SELECT o.customer_id, SUM(o.net_amount) as ltv
                FROM stg_orders o
                WHERE o.status != 'cancelled' {where_clause}
                GROUP BY 1
            )
            SELECT ROUND(AVG(ltv), 2)
            FROM customer_ltv
        """
        avg_ltv = conn.execute(ltv_query, params).fetchone()[0] or 0.0

        churn_query = f"""
            WITH cust_last_order AS (
                SELECT
                    o.customer_id,
                    MAX(o.order_date) as last_order_date,
                    (SELECT MAX(order_date) FROM stg_orders) as ref_date
                FROM stg_orders o
                WHERE o.status != 'cancelled' {where_clause}
                GROUP BY 1
            )
            SELECT
                ROUND(COUNT(CASE WHEN DATE_DIFF('day', CAST(last_order_date AS TIMESTAMP), CAST(ref_date AS TIMESTAMP)) > 90 THEN 1 END) * 100.0 / COUNT(*), 2)
            FROM cust_last_order
        """
        churn_rate = conn.execute(churn_query, params).fetchone()[0] or 0.0

        return {
            "active_customers": active_customers,
            "repeat_purchase_rate": repeat_rate,
            "blended_churn_rate": churn_rate,
            "average_ltv": avg_ltv
        }
    finally:
        conn.close()

@app.get("/api/cohort-retention")
def get_cohort_retention(
    granularity: str = Query("monthly", pattern="^(monthly|weekly)$"),
    channel: Optional[str] = Query(None),
    country: Optional[str] = Query(None)
):
    conn = get_db_conn()
    try:
        period_type = "month" if granularity == "monthly" else "week"

        clauses = []
        if channel:
            channels_list = [c.strip() for c in channel.split(",") if c.strip()]
            placeholders = ", ".join([f"'{c}'" for c in channels_list])
            clauses.append(f"c.acquisition_channel IN ({placeholders})")

        if country:
            countries_list = [c.strip() for c in country.split(",") if c.strip()]
            placeholders = ", ".join([f"'{c}'" for c in countries_list])
            clauses.append(f"c.country IN ({placeholders})")

        where_clause = " AND ".join(clauses)
        if where_clause:
            where_clause = "AND " + where_clause

        query = f"""
            WITH first_orders AS (
                SELECT customer_id, DATE_TRUNC('{period_type}', MIN(order_date)) as cohort_date
                FROM stg_orders
                WHERE status != 'cancelled'
                GROUP BY 1
            ),
            cohort_sizes AS (
                SELECT
                    fo.cohort_date as cohort,
                    COUNT(DISTINCT fo.customer_id) as cohort_size
                FROM first_orders fo
                JOIN stg_customers c ON fo.customer_id = c.customer_id
                WHERE 1=1 {where_clause}
                GROUP BY 1
            ),
            activity AS (
                SELECT
                    fo.cohort_date as cohort,
                    DATE_DIFF('{period_type}', fo.cohort_date, DATE_TRUNC('{period_type}', o.order_date)) as period_number,
                    COUNT(DISTINCT o.customer_id) as active_customers
                FROM stg_orders o
                JOIN first_orders fo ON o.customer_id = fo.customer_id
                JOIN stg_customers c ON o.customer_id = c.customer_id
                WHERE o.status != 'cancelled' {where_clause}
                GROUP BY 1, 2
            )
            SELECT
                a.cohort,
                a.period_number,
                c.cohort_size,
                a.active_customers,
                ROUND(a.active_customers * 100.0 / NULLIF(c.cohort_size, 0), 2) as retention_rate
            FROM activity a
            JOIN cohort_sizes c ON a.cohort = c.cohort
            ORDER BY a.cohort, a.period_number
        """

        res = conn.execute(query).fetchall()
        data = []
        for row in res:
            cohort_str = row[0].strftime("%Y-%m") if granularity == "monthly" else row[0].strftime("%Y-W%W")
            data.append({
                "cohort": cohort_str,
                "period": row[1],
                "cohort_size": row[2],
                "active_customers": row[3],
                "retention_rate": row[4]
            })
        return data
    finally:
        conn.close()

@app.get("/api/rfm")
def get_rfm(
    channel: Optional[str] = Query(None),
    country: Optional[str] = Query(None)
):
    conn = get_db_conn()
    try:
        clauses = []
        if channel:
            channels_list = [c.strip() for c in channel.split(",") if c.strip()]
            placeholders = ", ".join([f"'{c}'" for c in channels_list])
            clauses.append(f"c.acquisition_channel IN ({placeholders})")

        if country:
            countries_list = [c.strip() for c in country.split(",") if c.strip()]
            placeholders = ", ".join([f"'{c}'" for c in countries_list])
            clauses.append(f"c.country IN ({placeholders})")

        where_clause = " AND ".join(clauses)
        if where_clause:
            where_clause = "WHERE " + where_clause

        segment_query = f"""
            SELECT
                rfm.rfm_segment,
                COUNT(*) as count,
                ROUND(AVG(rfm.recency_days), 1) as avg_recency,
                ROUND(AVG(rfm.frequency_count), 2) as avg_frequency,
                ROUND(AVG(rfm.monetary_total), 2) as avg_monetary
            FROM mart_customer_rfm rfm
            JOIN stg_customers c ON rfm.customer_id = c.customer_id
            {where_clause}
            GROUP BY 1
            ORDER BY count DESC
        """
        segments_res = conn.execute(segment_query).fetchall()
        segments_data = [{"segment": r[0], "count": r[1], "avg_recency_days": r[2], "avg_frequency_count": r[3], "avg_monetary_value": r[4]} for r in segments_res]

        cust_list_query = f"""
            SELECT
                rfm.customer_id,
                c.acquisition_channel,
                c.country,
                rfm.recency_days,
                rfm.frequency_count,
                rfm.monetary_total,
                rfm.rfm_segment
            FROM mart_customer_rfm rfm
            JOIN stg_customers c ON rfm.customer_id = c.customer_id
            {where_clause}
            ORDER BY rfm.monetary_total DESC
            LIMIT 200
        """
        cust_res = conn.execute(cust_list_query).fetchall()
        cust_data = [{"customer_id": r[0], "channel": r[1], "country": r[2], "recency_days": r[3], "frequency_count": r[4], "monetary_total": r[5], "segment": r[6]} for r in cust_res]

        return {"segments": segments_data, "customers": cust_data}
    finally:
        conn.close()

@app.get("/api/channel-performance")
def get_channel_performance(
    channel: Optional[str] = Query(None)
):
    conn = get_db_conn()
    try:
        where_clause = ""
        if channel:
            channels_list = [c.strip() for c in channel.split(",") if c.strip()]
            placeholders = ", ".join([f"'{c}'" for c in channels_list])
            where_clause = f"WHERE channel IN ({placeholders})"

        query = f"""
            SELECT
                cohort_month,
                channel,
                cohort_size,
                total_spend,
                blended_cac,
                avg_historical_ltv,
                avg_predicted_ltv_12mo,
                ltv_to_cac_ratio
            FROM mart_channel_performance
            {where_clause}
            ORDER BY cohort_month, channel
        """
        res = conn.execute(query).fetchall()
        data = [{
            "cohort_month": r[0].strftime("%Y-%m"),
            "channel": r[1],
            "cohort_size": r[2],
            "total_spend": r[3],
            "blended_cac": r[4],
            "avg_historical_ltv": r[5],
            "avg_predicted_ltv_12mo": r[6],
            "ltv_to_cac_ratio": r[7]
        } for r in res]
        return data
    finally:
        conn.close()

@app.post("/api/refresh")
@app.post("/api/run-pipeline")
def run_pipeline(role: str = Depends(verify_role)):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Only Admins are permitted to trigger data refreshes.")

    try:
        import sys
        pipeline_script = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data_pipeline/run_pipeline.py"))

        result = subprocess.run(
            [sys.executable, pipeline_script],
            capture_output=True,
            text=True,
            check=False
        )

        if result.returncode != 0:
            raise Exception(result.stderr or result.stdout)

        return {
            "status": "success",
            "message": "ETL pipeline executed successfully",
            "output": result.stdout[-500:]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to execute ETL pipeline: {str(e)}")

from fastapi import UploadFile, File, Form
import shutil
import json

@app.post("/api/ingest")
def ingest_data(
    file: UploadFile = File(...),
    mapping: str = Form(...),
    role: str = Depends(verify_role)
):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Only Admins are permitted to ingest data.")
        
    try:
        # 1. Parse the mapping
        col_mapping = json.loads(mapping)
        required_cols = ["customer_id", "order_id", "order_date", "total_amount"]
        for col in required_cols:
            if col not in col_mapping or not col_mapping[col]:
                raise HTTPException(status_code=400, detail=f"Missing mapping for required column: {col}")

        # 2. Save uploaded file to temp path
        temp_path = os.path.join(os.path.dirname(__file__), "temp_upload.csv")
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 3. Read it into DuckDB and write it out to the raw_data_dir as orders.csv
        # We map the columns and add default values for missing columns
        raw_data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data_pipeline/raw_data"))
        target_csv = os.path.join(raw_data_dir, "orders.csv")
        
        # Build SELECT clause based on mapping
        select_clause = f"""
            "{col_mapping['order_id']}" AS order_id,
            "{col_mapping['customer_id']}" AS customer_id,
            "{col_mapping['order_date']}" AS order_date,
            'completed' AS status,
            "{col_mapping['total_amount']}" AS total_amount,
            'USD' AS currency,
            0.0 AS discount_amount
        """
        
        # Use DuckDB to quickly stream from temp_path to target_csv
        conn = duckdb.connect()
        try:
            # We overwrite the target_csv here. (If we wanted to append, we could, but let's replace for simplicity as AdminPage implies resetting the dataset)
            copy_query = f"""
                COPY (
                    SELECT {select_clause} 
                    FROM read_csv_auto('{temp_path}', all_varchar=true)
                ) 
                TO '{target_csv}' (FORMAT CSV, HEADER TRUE)
            """
            conn.execute(copy_query)
            
            # Count how many rows were inserted
            count = conn.execute(f"SELECT count(*) FROM read_csv_auto('{target_csv}')").fetchone()[0]
        finally:
            conn.close()
            
        # 4. Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        return {"status": "success", "message": f"Successfully ingested {count:,} records. Please Run ETL Pipeline."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
