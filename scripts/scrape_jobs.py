#!/usr/bin/env python3
"""
Scrape jobs from Indeed and Google Jobs using python-jobspy,
then POST them to the backend bulk-import endpoint.
"""

import os
import sys
import math
import json
from datetime import datetime

import requests
from jobspy import scrape_jobs

def _safe_int(val) -> int | None:
    """Convert a value to int, returning None for NaN/None/non-numeric."""
    if val is None:
        return None
    try:
        if math.isnan(val):
            return None
    except (TypeError, ValueError):
        pass
    try:
        return int(val)
    except (TypeError, ValueError):
        return None


def _clean_for_json(obj):
    """Recursively replace NaN/Inf floats with None for JSON serialization."""
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    if isinstance(obj, dict):
        return {k: _clean_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_clean_for_json(v) for v in obj]
    return obj


BACKEND_URL = os.environ.get("BACKEND_URL", "https://api.allfrontoffice.com")
CRON_API_KEY = os.environ.get("CRON_API_KEY", "")
BATCH_SIZE = 50

DEFAULT_QUERIES = [
    "software engineer",
    "frontend developer",
    "backend developer",
    "data engineer",
    "product manager",
    "devops engineer",
]

LOCATION = os.environ.get("JOBSPY_LOCATION", "United States")
RESULTS_WANTED = int(os.environ.get("JOBSPY_RESULTS_WANTED", "25"))
HOURS_OLD = int(os.environ.get("JOBSPY_HOURS_OLD", "24"))
SITES = ["indeed", "google"]


def map_job(row: dict) -> dict | None:
    """Map a jobspy row dict to our JobData schema."""
    title = row.get("title")
    company = row.get("company")
    if not title or not company:
        return None

    # Location: prefer city+state, fall back to location field
    city = row.get("city") or ""
    state = row.get("state") or ""
    if city and state:
        location = f"{city}, {state}"
    elif city:
        location = city
    elif state:
        location = state
    else:
        location = row.get("location") or "United States"

    # Remote
    is_remote = row.get("is_remote")
    remote = 1 if is_remote is True else 0

    # Description
    description = row.get("description") or ""
    if len(description) > 10000:
        description = description[:10000]

    # Salary (enforce_annual_salary is set in scrape call)
    salary_min = _safe_int(row.get("min_amount"))
    salary_max = _safe_int(row.get("max_amount"))

    # Posted date → unix timestamp
    date_posted = row.get("date_posted")
    if isinstance(date_posted, str):
        try:
            posted_date = int(datetime.fromisoformat(date_posted).timestamp())
        except (ValueError, TypeError):
            posted_date = int(datetime.now().timestamp())
    elif hasattr(date_posted, "timestamp"):
        posted_date = int(date_posted.timestamp())
    else:
        posted_date = int(datetime.now().timestamp())

    # Source
    source = str(row.get("site", "")).lower()
    if source not in ("indeed", "google"):
        source = "indeed"

    # Contract time
    job_type = str(row.get("job_type") or "").lower()
    contract_time_map = {
        "fulltime": "full_time",
        "parttime": "part_time",
        "contract": "contract",
        "internship": "internship",
    }
    contract_time = contract_time_map.get(job_type)

    job_url = row.get("job_url") or ""
    if not job_url:
        return None

    return {
        "title": title,
        "company": company,
        "location": location,
        "state": state if state else None,
        "remote": remote,
        "description": description,
        "requirements": "[]",
        "salary_min": salary_min,
        "salary_max": salary_max,
        "posted_date": posted_date,
        "source": source,
        "external_url": job_url,
        "contract_time": contract_time,
        "contract_type": None,
        "category_tag": None,
        "category_label": None,
        "salary_is_predicted": 0,
        "latitude": None,
        "longitude": None,
        "adref": None,
    }


def post_batch(jobs: list[dict]) -> dict:
    """POST a batch of jobs to the bulk-import endpoint."""
    url = f"{BACKEND_URL}/api/cron/bulk-import"
    headers = {"Content-Type": "application/json", "X-API-Key": CRON_API_KEY}
    cleaned = _clean_for_json(jobs)
    resp = requests.post(url, json={"jobs": cleaned}, headers=headers, timeout=60)
    resp.raise_for_status()
    return resp.json()


def main():
    if not CRON_API_KEY:
        print("ERROR: CRON_API_KEY environment variable is required")
        sys.exit(1)

    queries = os.environ.get("JOBSPY_QUERIES", "").strip()
    if queries:
        search_queries = [q.strip() for q in queries.split(",") if q.strip()]
    else:
        search_queries = DEFAULT_QUERIES

    all_jobs: list[dict] = []
    seen_urls: set[str] = set()

    for query in search_queries:
        print(f"Scraping: '{query}' from {SITES} ...")
        try:
            df = scrape_jobs(
                site_name=SITES,
                search_term=query,
                location=LOCATION,
                results_wanted=RESULTS_WANTED,
                hours_old=HOURS_OLD,
                enforce_annual_salary=True,
                country_indeed="USA",
            )
        except Exception as e:
            print(f"  Error scraping '{query}': {e}")
            continue

        count = 0
        for _, row in df.iterrows():
            mapped = map_job(row.to_dict())
            if mapped and mapped["external_url"] not in seen_urls:
                seen_urls.add(mapped["external_url"])
                all_jobs.append(mapped)
                count += 1
        print(f"  Got {count} unique jobs (total so far: {len(all_jobs)})")

    if not all_jobs:
        print("No jobs scraped. Exiting.")
        return

    # Send in batches
    total_imported = 0
    total_updated = 0
    total_errors = 0

    for i in range(0, len(all_jobs), BATCH_SIZE):
        batch = all_jobs[i : i + BATCH_SIZE]
        print(f"Sending batch {i // BATCH_SIZE + 1} ({len(batch)} jobs) ...")
        try:
            result = post_batch(batch)
            total_imported += result.get("imported", 0)
            total_updated += result.get("updated", 0)
            total_errors += result.get("errors", 0)
            print(f"  Result: {result}")
        except Exception as e:
            print(f"  Error sending batch: {e}")
            total_errors += len(batch)

    print(f"\nDone! Imported: {total_imported}, Updated: {total_updated}, Errors: {total_errors}")


if __name__ == "__main__":
    main()
