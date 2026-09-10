"""Tests for conversion pipeline endpoints."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from fastapi.testclient import TestClient

from lead_intelligence.api import app

client = TestClient(app)


def test_conversion_pipeline_status():
    resp = client.get("/conversion/pipeline-status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ready"
    assert data["feature_count"] == 32


def test_conversion_metrics():
    resp = client.get("/conversion/metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert data["model_name"] == "XGBoost Lead Conversion Predictor"
    assert data["roc_auc_score"] > 0.9
    assert data["precision"] > 0.8
    assert data["recall"] > 0.9


def test_scored_leads_default():
    resp = client.get("/conversion/scored-leads?limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] > 0
    assert len(data["leads"]) <= 5
    lead = data["leads"][0]
    assert "lead_id" in lead
    assert "lead_score" in lead
    assert "lead_category" in lead
    assert lead["lead_category"] in ("Hot", "Warm", "Cold")


def test_scored_leads_filter_by_category():
    resp = client.get("/conversion/scored-leads?category=Hot&limit=10")
    assert resp.status_code == 200
    data = resp.json()
    for lead in data["leads"]:
        assert lead["lead_category"] == "Hot"


def test_conversion_predict_single():
    payload = {
        "lead_id": "test-lead-1",
        "features": {
            "TotalVisits": 5.0,
            "Total Time Spent on Website": 900.0,
            "Page Views Per Visit": 3.0,
            "Asymmetrique Activity Score": 15.0,
            "Asymmetrique Profile Score": 15.0,
            "Lead Origin": "API",
            "Lead Source": "Organic Search",
            "Do Not Email": "No",
            "Do Not Call": "No",
            "Last Activity": "SMS Sent",
            "Country": "India",
            "Specialization": "Finance Management",
            "What is your current occupation": "Working Professional",
            "What matters most to you in choosing a course": "Better Career Prospects",
            "Search": "No",
            "Magazine": "No",
            "Newspaper Article": "No",
            "X Education Forums": "No",
            "Newspaper": "No",
            "Digital Advertisement": "No",
            "Through Recommendations": "No",
            "Receive More Updates About Our Courses": "No",
            "Tags": "Will revert after reading the email",
            "Lead Quality": "High in Relevance",
            "Update me on Supply Chain Content": "No",
            "Get updates on DM Content": "No",
            "City": "Mumbai",
            "Asymmetrique Activity Index": "02.Medium",
            "Asymmetrique Profile Index": "02.Medium",
            "I agree to pay the amount through cheque": "No",
            "A free copy of Mastering The Interview": "No",
            "Last Notable Activity": "SMS Sent",
        },
    }
    resp = client.post("/conversion/predict", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["lead_id"] == "test-lead-1"
    assert 0 <= data["predicted_probability"] <= 1
    assert 0 <= data["lead_score"] <= 100
    assert data["lead_category"] in ("Hot", "Warm", "Cold")
    assert data["predicted_converted"] in (0, 1)


def test_conversion_predict_batch():
    payload = {
        "leads": [
            {
                "Lead_ID": "batch-1",
                "TotalVisits": 10.0,
                "Total Time Spent on Website": 1500.0,
                "Page Views Per Visit": 5.0,
                "Asymmetrique Activity Score": 15.0,
                "Asymmetrique Profile Score": 17.0,
                "Lead Origin": "API",
                "Lead Source": "Organic Search",
                "Do Not Email": "No",
                "Do Not Call": "No",
                "Last Activity": "Email Opened",
                "Country": "India",
                "Specialization": "Business Administration",
                "What is your current occupation": "Unemployed",
                "What matters most to you in choosing a course": "Better Career Prospects",
                "Search": "No",
                "Magazine": "No",
                "Newspaper Article": "No",
                "X Education Forums": "No",
                "Newspaper": "No",
                "Digital Advertisement": "No",
                "Through Recommendations": "No",
                "Receive More Updates About Our Courses": "No",
                "Tags": "Interested in other courses",
                "Lead Quality": "Might be",
                "Update me on Supply Chain Content": "No",
                "Get updates on DM Content": "No",
                "City": "Mumbai",
                "Asymmetrique Activity Index": "02.Medium",
                "Asymmetrique Profile Index": "01.High",
                "I agree to pay the amount through cheque": "No",
                "A free copy of Mastering The Interview": "Yes",
                "Last Notable Activity": "Modified",
            }
        ]
    }
    resp = client.post("/conversion/predict-batch", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["results"][0]["lead_id"] == "batch-1"


def test_get_demo_pipeline_20():
    """Verify that the 20-lead pipeline endpoint returns exactly 20 leads with all 3 classes, evidence, and lock chances."""
    resp = client.get("/conversion/demo-pipeline-20")
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "ok"
    assert data["summary"]["total"] == 20
    assert data["summary"]["hot_count"] > 0
    assert data["summary"]["warm_count"] > 0
    assert data["summary"]["cold_count"] > 0
    assert data["summary"]["hot_avg_lock_chance"] >= 80.0
    assert data["summary"]["cold_avg_lock_chance"] < 40.0

    leads = data["leads"]
    assert len(leads) == 20
    for lead in leads:
        assert "lead_id" in lead
        assert "contact_name" in lead
        assert "company" in lead
        assert "lock_chance_pct" in lead
        assert "confidence_level" in lead
        assert "primary_driver" in lead
        assert "lock_strategy" in lead
        assert lead["lead_category"] in ("Hot", "Warm", "Cold")


def test_run_demo_pipeline_20():
    """Verify live benchmark execution of the 20-lead pipeline."""
    resp = client.post("/conversion/demo-pipeline-20/run")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["pipeline_execution_time_ms"] > 0
    assert len(data["leads"]) == 20


def test_get_sample_injection_dataset():
    """Verify endpoint returning 25 raw uncleaned leads."""
    resp = client.get("/conversion/sample-injection-dataset")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 25
    assert "contact_name" in data[0]


def test_inject_pipeline_with_raw_leads():
    """Verify end-to-end cleaning, imputation, and scoring on injected dataset."""
    sample_resp = client.get("/conversion/sample-injection-dataset")
    raw_leads = sample_resp.json()

    resp = client.post("/conversion/inject-pipeline", json={"leads": raw_leads})
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "ok"
    assert data["pipeline_execution_time_ms"] > 0
    assert data["cleaning_report"]["total_records"] == 25
    assert data["cleaning_report"]["missing_values_imputed"] > 0
    assert len(data["cleaning_report"]["cleaning_steps"]) >= 4

    leads = data["leads"]
    assert len(leads) == 25
    assert data["summary"]["hot_count"] > 0
    assert data["summary"]["warm_count"] > 0
    assert data["summary"]["cold_count"] > 0

    for lead in leads:
        assert lead["lead_category"] in ("Hot", "Warm", "Cold")
        assert 0.0 <= lead["lock_chance_pct"] <= 100.0
        assert lead["confidence_level"] in ("Very High", "High", "Moderate", "Low")
        assert lead["primary_driver"] != ""


def test_inject_pipeline_with_csv_text():
    """Verify parsing and scoring from raw CSV text string."""
    csv_payload = (
        "contact,company,visits,time_spent,quality,tags\n"
        "Alice Wonder,Wonderland Tech,10,1800,High in Relevance,Closed by Horizzon\n"
        "Bob Builder,Bob Constr,1,10,Worst,Ringing\n"
        "Charlie Day,Day Logistics,4,800,Might be,Will revert after reading the email\n"
    )
    resp = client.post("/conversion/inject-pipeline", json={"csv_text": csv_payload})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["leads"]) == 3
    assert data["leads"][0]["lead_category"] == "Hot"
    assert data["leads"][0]["lock_chance_pct"] >= 80.0


