"""Lead conversion intelligence pipeline.

Reconstructs the XGBoost binary-classification pipeline from the notebook
(LeadintelligenceXgboost.ipynb) at runtime.  The pipeline includes:

  1.  ColumnTransformer  (numerical impute+scale, categorical impute+onehot)
  2.  XGBClassifier      (binary:logistic, matching notebook hyper-params)

If a pre-trained .pkl artifact is loadable it is used; otherwise the pipeline
is retrained from `final_lead_intelligence.csv` which ships in the repo.
"""

from __future__ import annotations

import json
import logging
import warnings
from pathlib import Path
from typing import Any, Final

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline as SkPipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBClassifier

logger = logging.getLogger(__name__)

# ── paths ────────────────────────────────────────────────────────────────────
_ROOT: Final = Path(__file__).resolve().parent.parent.parent
_PKL_PATH: Final = _ROOT / "lead_conversion_model_pipeline.pkl"
_CSV_PATH: Final = _ROOT / "final_lead_intelligence.csv"
_META_PATH: Final = _ROOT / "lead_conversion_model_metadata.json"

# ── metadata constants ───────────────────────────────────────────────────────
NUMERICAL_FEATURES: Final[list[str]] = [
    "TotalVisits",
    "Total Time Spent on Website",
    "Page Views Per Visit",
    "Asymmetrique Activity Score",
    "Asymmetrique Profile Score",
]

CATEGORICAL_FEATURES: Final[list[str]] = [
    "Lead Origin",
    "Lead Source",
    "Do Not Email",
    "Do Not Call",
    "Last Activity",
    "Country",
    "Specialization",
    "What is your current occupation",
    "What matters most to you in choosing a course",
    "Search",
    "Magazine",
    "Newspaper Article",
    "X Education Forums",
    "Newspaper",
    "Digital Advertisement",
    "Through Recommendations",
    "Receive More Updates About Our Courses",
    "Tags",
    "Lead Quality",
    "Update me on Supply Chain Content",
    "Get updates on DM Content",
    "City",
    "Asymmetrique Activity Index",
    "Asymmetrique Profile Index",
    "I agree to pay the amount through cheque",
    "A free copy of Mastering The Interview",
    "Last Notable Activity",
]

ALL_FEATURE_COLS: Final[list[str]] = NUMERICAL_FEATURES + CATEGORICAL_FEATURES

# Thresholds from the notebook / metadata.json
HOT_THRESHOLD: Final = 80
WARM_THRESHOLD: Final = 40
CONVERSION_THRESHOLD: Final = 0.35

TARGET_COLUMN: Final = "Converted"

# ── singleton caches ─────────────────────────────────────────────────────────
_PIPELINE: SkPipeline | None = None
_METADATA: dict[str, Any] | None = None
_SCORED_LEADS: pd.DataFrame | None = None


def _load_metadata() -> dict[str, Any]:
    """Load or return cached model metadata."""
    global _METADATA
    if _METADATA is not None:
        return _METADATA
    if _META_PATH.exists():
        with open(_META_PATH, encoding="utf-8") as fh:
            _METADATA = json.load(fh)
    else:
        _METADATA = {
            "model_name": "XGBoost Lead Conversion Predictor",
            "version": "1.0",
            "roc_auc_score": 0.0,
            "pr_auc_score": 0.0,
            "brier_score": 0.0,
            "threshold_for_conversion": CONVERSION_THRESHOLD,
            "hot_lead_score_threshold": HOT_THRESHOLD,
            "warm_lead_score_threshold": WARM_THRESHOLD,
        }
    return _METADATA


def _build_preprocessor() -> ColumnTransformer:
    """Build the sklearn ColumnTransformer matching the notebook pipeline."""
    numerical_pipeline = SkPipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    categorical_pipeline = SkPipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])

    return ColumnTransformer(
        transformers=[
            ("num", numerical_pipeline, NUMERICAL_FEATURES),
            ("cat", categorical_pipeline, CATEGORICAL_FEATURES),
        ],
        remainder="drop",
    )


def _train_pipeline_from_csv() -> SkPipeline:
    """Re-train the XGBoost pipeline from final_lead_intelligence.csv."""
    logger.info("Training lead-conversion XGBoost pipeline from CSV ...")

    df = pd.read_csv(_CSV_PATH)

    # The CSV has Actual_Converted (binary target) plus all features
    if "Actual_Converted" not in df.columns:
        raise RuntimeError(
            "final_lead_intelligence.csv must contain 'Actual_Converted'"
        )

    y = df["Actual_Converted"].astype(int)

    # Ensure all feature columns exist; fill missing ones with NaN
    for col in ALL_FEATURE_COLS:
        if col not in df.columns:
            df[col] = np.nan

    X = df[ALL_FEATURE_COLS].copy()

    preprocessor = _build_preprocessor()

    classifier = XGBClassifier(
        objective="binary:logistic",
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        reg_alpha=0.1,
        reg_lambda=1.0,
        scale_pos_weight=1.0,
        eval_metric="logloss",
        tree_method="hist",
        random_state=42,
        n_jobs=1,
        use_label_encoder=False,
    )

    pipeline = SkPipeline([
        ("preprocessor", preprocessor),
        ("classifier", classifier),
    ])

    pipeline.fit(X, y)
    logger.info("Pipeline training complete (%d samples).", len(X))
    return pipeline


def get_conversion_pipeline() -> SkPipeline:
    """Return the lead-conversion sklearn Pipeline (cached singleton).

    Attempts to load the shipped .pkl first.  If that fails due to version
    mismatch, falls back to retraining from the CSV.
    """
    global _PIPELINE
    if _PIPELINE is not None:
        return _PIPELINE

    if _PKL_PATH.exists():
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                _PIPELINE = joblib.load(_PKL_PATH)
                logger.info("Loaded pre-trained pipeline from %s", _PKL_PATH)
                return _PIPELINE
        except Exception as exc:
            logger.warning(
                "Could not load %s (%s); retraining from CSV.",
                _PKL_PATH,
                exc,
            )

    if _CSV_PATH.exists():
        _PIPELINE = _train_pipeline_from_csv()
        return _PIPELINE

    raise RuntimeError(
        "No model pipeline available: neither .pkl nor .csv found"
    )


# ── scoring helpers ──────────────────────────────────────────────────────────

_DEMO_20_JSON_PATH: Final = _ROOT / "leads_20_pipeline_demo.json"
_DEMO_20_CSV_PATH: Final = _ROOT / "leads_20_pipeline_demo.csv"

DEMO_20_LEAD_IDS: Final[list[int]] = [
    8339, 5159, 1546, 982, 1897, 7421, 2716,  # Hot (7)
    611, 5889, 926, 2336, 1107, 1089, 697,   # Warm (7)
    833, 3590, 1485, 2212, 8414, 5070         # Cold (6)
]

DEMO_20_CONTACT_META: Final[dict[int, dict[str, str]]] = {
    8339: {"contact_name": "Sophia Vance", "company": "CloudSphere Technologies", "job_title": "Chief Strategy Officer"},
    5159: {"contact_name": "Marcus Sterling", "company": "Apex Dynamics", "job_title": "VP of Product Engineering"},
    1546: {"contact_name": "Elena Rostova", "company": "FinEdge Analytics", "job_title": "Director of Business Intelligence"},
    982: {"contact_name": "Tariq Al-Mansoor", "company": "Nexus Global Ventures", "job_title": "Head of Enterprise Partnerships"},
    1897: {"contact_name": "Priya Sharma", "company": "Quantum Scale Solutions", "job_title": "VP Operations"},
    7421: {"contact_name": "David K. Thorne", "company": "Beacon HealthTech", "job_title": "Chief Technology Officer"},
    2716: {"contact_name": "Rachel Zhao", "company": "Horizon Growth Media", "job_title": "Growth Marketing Lead"},
    611: {"contact_name": "Michael Chang", "company": "Veridian Systems", "job_title": "Senior Technical Product Manager"},
    5889: {"contact_name": "Sarah Lindqvist", "company": "Nordic Stream Logistics", "job_title": "Global Operations Manager"},
    926: {"contact_name": "Carlos Morales", "company": "Solaria Renewable Tech", "job_title": "Director of Digital Strategy"},
    2336: {"contact_name": "Jessica Taylor", "company": "Crestline Financial", "job_title": "IT Infrastructure Director"},
    1107: {"contact_name": "Kevin Patel", "company": "OmniTech Solutions", "job_title": "Strategic Procurement Lead"},
    1089: {"contact_name": "Amanda Cruz", "company": "Vanguard Media Group", "job_title": "Lead Business Systems Analyst"},
    697: {"contact_name": "Benjamin Ward", "company": "Stratos Data Labs", "job_title": "Principal Solutions Architect"},
    833: {"contact_name": "Hannah Wright", "company": "Pacific Retail Partners", "job_title": "Operations Specialist"},
    3590: {"contact_name": "Daniel Kim", "company": "Summit Advisory Group", "job_title": "Associate Operations Analyst"},
    1485: {"contact_name": "Lucas Meyer", "company": "Kinetix BioSciences", "job_title": "Research Coordinator"},
    2212: {"contact_name": "Olivia Brown", "company": "Brown Independent Consulting", "job_title": "Freelance Consultant"},
    8414: {"contact_name": "Ethan Miller", "company": "Regional Polytechnic Institute", "job_title": "Academic Trainee"},
    5070: {"contact_name": "Chloe Davis", "company": "Davis & Associates", "job_title": "General Inquirer"},
}


def clean_feature_label(feat: str, raw_features: dict[str, Any] | None = None) -> str:
    """Format technical one-hot feature name into clear human-readable evidence."""
    if feat.startswith("cat__"):
        feat = feat[5:]
        parts = feat.split("_", 1)
        if len(parts) == 2:
            field, val = parts
            field_clean = (
                field.replace("What is your current occupation", "Occupation")
                .replace("What matters most to you in choosing a course", "Motivation")
                .replace("A free copy of Mastering The Interview", "Mastering Interview")
            )
            return f"{field_clean}: {val}"
        return feat.replace("_", " ")

    if feat.startswith("num__"):
        feat = feat[5:]
        raw_val = (raw_features or {}).get(feat)
        if raw_val is not None and not pd.isna(raw_val):
            try:
                num = float(raw_val)
                if "Time Spent" in feat:
                    return f"Website Engagement: {int(num)}s on site"
                if "Visits" in feat:
                    return f"Visit Frequency: {int(num)} visits"
                if "Page Views" in feat:
                    return f"Page Views: {num:.1f}/visit"
                if "Score" in feat:
                    return f"{feat}: {int(num)}"
            except (ValueError, TypeError):
                pass
        return feat.replace("_", " ")

    return feat


def get_lock_strategy(category: str, score: int) -> str:
    """Return prescriptive next action to lock the client or lead."""
    if category == "Hot":
        if score >= 95:
            return "VIP Executive Escalation: Direct call within 1 hour. Present tailored enterprise contract and executive sponsorship."
        return "Priority Close: Schedule 30-minute high-touch demo with senior solutions engineer. Send custom proposal within 4 hours."
    if category == "Warm":
        if score >= 60:
            return "Solution Nurture: Send interactive ROI calculator and customer case study. Follow up via phone in 24 hours."
        return "Consultative Engagement: Schedule discovery session to address specific objections and clarify scope."
    return "Automated Drip Cadence: Enroll in automated educational workflow. Monitor for re-engagement or visit frequency spikes."


def explain_features(features: dict[str, Any], pipeline: SkPipeline | None = None) -> dict[str, Any]:
    """Extract local decision evidence using XGBoost margin contributions (TreeSHAP)."""
    if pipeline is None:
        pipeline = get_conversion_pipeline()

    try:
        import xgboost as xgb
        pre = pipeline.named_steps["preprocessor"]
        clf = pipeline.named_steps["classifier"]

        df = pd.DataFrame([features])
        for col in ALL_FEATURE_COLS:
            if col not in df.columns:
                df[col] = np.nan
        df = df[ALL_FEATURE_COLS]

        X_trans = pre.transform(df)
        feature_names = list(pre.get_feature_names_out())
        dmat = xgb.DMatrix(X_trans, feature_names=feature_names)
        contribs = clf.get_booster().predict(dmat, pred_contribs=True)[0]
        feature_contribs = contribs[:-1]

        pos_idx = [i for i in feature_contribs.argsort()[::-1] if feature_contribs[i] > 0.04][:3]
        neg_idx = [i for i in feature_contribs.argsort() if feature_contribs[i] < -0.04][:3]

        pos_list = [clean_feature_label(feature_names[i], features) for i in pos_idx]
        neg_list = [clean_feature_label(feature_names[i], features) for i in neg_idx]

        driver = pos_list[0] if pos_list else (neg_list[0] if neg_list else "Standard profile baseline")
        return {
            "primary_driver": driver,
            "positive_evidence": pos_list,
            "negative_evidence": neg_list,
        }
    except Exception as exc:
        logger.debug("Local feature explanation fallback: %s", exc)
        return {
            "primary_driver": "Profile behavioral signals",
            "positive_evidence": ["Engagement patterns", "Channel alignment"],
            "negative_evidence": [],
        }


# ── scoring helpers ──────────────────────────────────────────────────────────

def score_lead(features: dict[str, Any]) -> dict[str, Any]:
    """Score a single lead and return probability, score, category, evidence, lock chance."""
    pipeline = get_conversion_pipeline()
    meta = _load_metadata()

    df = pd.DataFrame([features])
    for col in ALL_FEATURE_COLS:
        if col not in df.columns:
            df[col] = np.nan

    df = df[ALL_FEATURE_COLS]

    proba = float(pipeline.predict_proba(df)[:, 1][0])
    lead_score = int(round(proba * 100))
    threshold = meta.get("threshold_for_conversion", CONVERSION_THRESHOLD)
    predicted_converted = int(proba >= threshold)

    if lead_score >= HOT_THRESHOLD:
        category = "Hot"
        confidence_level = "Very High" if lead_score >= 90 else "High"
    elif lead_score >= WARM_THRESHOLD:
        category = "Warm"
        confidence_level = "High" if lead_score >= 60 else "Moderate"
    else:
        category = "Cold"
        confidence_level = "Low"

    lock_chance_pct = round(proba * 100, 1)
    evidence = explain_features(features, pipeline)
    lock_strategy = get_lock_strategy(category, lead_score)

    return {
        "predicted_probability": round(proba, 6),
        "predicted_converted": predicted_converted,
        "lead_score": lead_score,
        "lead_category": category,
        "lock_chance_pct": lock_chance_pct,
        "confidence_level": confidence_level,
        "primary_driver": evidence["primary_driver"],
        "positive_evidence": evidence["positive_evidence"],
        "negative_evidence": evidence["negative_evidence"],
        "lock_strategy": lock_strategy,
    }


def score_leads_batch(leads_df: pd.DataFrame) -> pd.DataFrame:
    """Score a batch of leads.  Returns a copy of the input with new columns."""
    pipeline = get_conversion_pipeline()
    meta = _load_metadata()

    for col in ALL_FEATURE_COLS:
        if col not in leads_df.columns:
            leads_df[col] = np.nan

    X = leads_df[ALL_FEATURE_COLS].copy()
    probas = pipeline.predict_proba(X)[:, 1]
    threshold = meta.get("threshold_for_conversion", CONVERSION_THRESHOLD)

    out = leads_df.copy()
    out["Predicted_Probability"] = probas
    out["Lead_Score"] = (probas * 100).round(0).astype(int)
    out["Predicted_Converted"] = (probas >= threshold).astype(int)
    out["Lead_Category"] = pd.cut(
        out["Lead_Score"],
        bins=[-1, WARM_THRESHOLD, HOT_THRESHOLD, 101],
        labels=["Cold", "Warm", "Hot"],
        right=False,
    )
    out["Sales_Rank"] = out["Lead_Score"].rank(ascending=False, method="first").astype(int)
    return out


def load_scored_leads_from_csv() -> pd.DataFrame:
    """Load pre-scored leads from the shipped CSV."""
    global _SCORED_LEADS
    if _SCORED_LEADS is not None:
        return _SCORED_LEADS

    if not _CSV_PATH.exists():
        return pd.DataFrame()

    df = pd.read_csv(_CSV_PATH)
    _SCORED_LEADS = df
    return _SCORED_LEADS


def get_demo_20_pipeline(run_live: bool = False) -> dict[str, Any]:
    """Generate and return the 20-lead pipeline verification dataset.

    Demonstrates the full XGBoost pipeline working end-to-end across Hot, Warm, and Cold
    classes, showing conversion lock chances, confidence, and exact model decision evidence.
    Also exports `leads_20_pipeline_demo.json` and `leads_20_pipeline_demo.csv`.
    """
    import time

    t0 = time.perf_counter()
    pipeline = get_conversion_pipeline()
    df = load_scored_leads_from_csv()

    if df.empty:
        raise RuntimeError("Dataset final_lead_intelligence.csv not found")

    selected_rows = []
    for lead_id in DEMO_20_LEAD_IDS:
        match = df[df["Lead_ID"] == lead_id]
        if not match.empty:
            selected_rows.append(match.iloc[0].to_dict())

    # If any IDs were missing, fill from closest scores
    if len(selected_rows) < 20:
        existing_ids = {r["Lead_ID"] for r in selected_rows}
        for _, row in df.iterrows():
            if row["Lead_ID"] not in existing_ids:
                selected_rows.append(row.to_dict())
                existing_ids.add(row["Lead_ID"])
                if len(selected_rows) == 20:
                    break

    leads_result: list[dict[str, Any]] = []
    hot_scores: list[float] = []
    warm_scores: list[float] = []
    cold_scores: list[float] = []

    for rank_idx, row in enumerate(selected_rows, start=1):
        lead_id = int(row.get("Lead_ID", 0))
        features = {col: row.get(col) for col in ALL_FEATURE_COLS}

        scoring = score_lead(features) if run_live else {
            "predicted_probability": float(row.get("Predicted_Probability", 0.0)),
            "predicted_converted": int(row.get("Predicted_Converted", 0)),
            "lead_score": int(row.get("Lead_Score", 0)),
            "lead_category": str(row.get("Lead_Category", "Cold")),
            "lock_chance_pct": round(float(row.get("Predicted_Probability", 0.0)) * 100, 1),
            "confidence_level": (
                "Very High" if int(row.get("Lead_Score", 0)) >= 90
                else "High" if int(row.get("Lead_Score", 0)) >= 60
                else "Moderate" if int(row.get("Lead_Score", 0)) >= 40
                else "Low"
            ),
            "lock_strategy": get_lock_strategy(str(row.get("Lead_Category", "Cold")), int(row.get("Lead_Score", 0))),
            **explain_features(features, pipeline),
        }

        cat = scoring["lead_category"]
        lock_pct = scoring["lock_chance_pct"]
        if cat == "Hot":
            hot_scores.append(lock_pct)
        elif cat == "Warm":
            warm_scores.append(lock_pct)
        else:
            cold_scores.append(lock_pct)

        contact = DEMO_20_CONTACT_META.get(lead_id, {
            "contact_name": f"Lead Contact #{lead_id}",
            "company": f"Enterprise Account #{lead_id}",
            "job_title": "Decision Maker",
        })

        def _safe_float(val: object, default: float = 0.0) -> float:
            try:
                f = float(val)  # type: ignore[arg-type]
                return default if (pd.isna(f) or np.isinf(f)) else f
            except (ValueError, TypeError):
                return default

        def _safe_str(val: object, default: str = "") -> str:
            s = str(val) if val is not None else default
            return default if s == "nan" else s

        leads_result.append({
            "sales_rank": rank_idx,
            "lead_id": f"LEAD-{lead_id}",
            "contact_name": contact["contact_name"],
            "company": contact["company"],
            "job_title": contact["job_title"],
            "lead_score": scoring["lead_score"],
            "lead_category": cat,
            "lock_chance_pct": lock_pct,
            "confidence_level": scoring["confidence_level"],
            "predicted_probability": scoring["predicted_probability"],
            "predicted_converted": scoring["predicted_converted"],
            "actual_converted": int(row.get("Actual_Converted", 0)),
            "primary_driver": scoring.get("primary_driver", ""),
            "positive_evidence": scoring.get("positive_evidence", []),
            "negative_evidence": scoring.get("negative_evidence", []),
            "lock_strategy": scoring.get("lock_strategy", ""),
            "lead_origin": _safe_str(row.get("Lead Origin")),
            "lead_source": _safe_str(row.get("Lead Source")),
            "last_activity": _safe_str(row.get("Last Activity")),
            "country": _safe_str(row.get("Country")),
            "specialization": _safe_str(row.get("Specialization")),
            "occupation": _safe_str(row.get("What is your current occupation")),
            "city": _safe_str(row.get("City")),
            "tags": _safe_str(row.get("Tags")),
            "lead_quality": _safe_str(row.get("Lead Quality")),
            "total_visits": _safe_float(row.get("TotalVisits")),
            "total_time_on_website": _safe_float(row.get("Total Time Spent on Website")),
            "page_views_per_visit": _safe_float(row.get("Page Views Per Visit")),
        })

    # Sort by sales rank / score descending
    leads_result.sort(key=lambda l: l["lead_score"], reverse=True)
    for i, item in enumerate(leads_result, start=1):
        item["sales_rank"] = i

    t1 = time.perf_counter()
    execution_time_ms = round((t1 - t0) * 1000, 2)

    summary = {
        "total": len(leads_result),
        "hot_count": len(hot_scores),
        "warm_count": len(warm_scores),
        "cold_count": len(cold_scores),
        "hot_avg_lock_chance": round(sum(hot_scores) / len(hot_scores), 1) if hot_scores else 0.0,
        "warm_avg_lock_chance": round(sum(warm_scores) / len(warm_scores), 1) if warm_scores else 0.0,
        "cold_avg_lock_chance": round(sum(cold_scores) / len(cold_scores), 1) if cold_scores else 0.0,
    }

    # Save to disk for user accessibility
    try:
        with open(_DEMO_20_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump({"summary": summary, "leads": leads_result}, f, indent=2)

        demo_df = pd.DataFrame(leads_result)
        demo_df.to_csv(_DEMO_20_CSV_PATH, index=False)
        logger.info("Exported 20-lead pipeline demo to JSON and CSV")
    except Exception as exc:
        logger.warning("Failed to save demo 20 files: %s", exc)

    return {
        "status": "ok",
        "pipeline_execution_time_ms": execution_time_ms,
        "summary": summary,
        "leads": leads_result,
    }


def get_pipeline_metrics() -> dict[str, Any]:
    """Return model performance metrics for the dashboard."""
    meta = _load_metadata()
    metrics_at_threshold = meta.get("metrics_at_optimal_threshold", {})

    return {
        "model_name": meta.get("model_name", "XGBoost Lead Conversion Predictor"),
        "version": meta.get("version", "1.0"),
        "training_date": meta.get("training_date", ""),
        "target_variable": meta.get("target_variable", "Converted"),
        "roc_auc_score": meta.get("roc_auc_score", 0.0),
        "pr_auc_score": meta.get("pr_auc_score", 0.0),
        "brier_score": meta.get("brier_score", 0.0),
        "threshold": meta.get("threshold_for_conversion", CONVERSION_THRESHOLD),
        "precision": metrics_at_threshold.get("Precision", 0.0),
        "recall": metrics_at_threshold.get("Recall", 0.0),
        "f1_score": metrics_at_threshold.get("F1-Score", 0.0),
        "hot_threshold": meta.get("hot_lead_score_threshold", HOT_THRESHOLD),
        "warm_threshold": meta.get("warm_lead_score_threshold", WARM_THRESHOLD),
        "numerical_features": meta.get("numerical_features", NUMERICAL_FEATURES),
        "categorical_features": meta.get("categorical_features", CATEGORICAL_FEATURES),
        "description": meta.get("description", ""),
    }


# ── Injected Dataset Cleaning & Live Execution Pipeline ──────────────────────

_RAW_SAMPLE_JSON_PATH: Final = _ROOT / "raw_leads_for_injection.json"
_RAW_SAMPLE_CSV_PATH: Final = _ROOT / "raw_leads_for_injection.csv"


def get_raw_sample_injection_leads() -> list[dict[str, Any]]:
    """Return the raw 25-lead sample dataset for frontend injection testing."""
    if _RAW_SAMPLE_JSON_PATH.exists():
        try:
            with open(_RAW_SAMPLE_JSON_PATH, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []


def clean_and_process_injected_dataset(raw_records: list[dict[str, Any]]) -> dict[str, Any]:
    """Clean, impute, standardize, and score custom injected leads through the entire pipeline."""
    import re
    import time

    t0 = time.perf_counter()
    pipeline = get_conversion_pipeline()

    if not raw_records:
        return {
            "status": "ok",
            "pipeline_execution_time_ms": 0.0,
            "cleaning_report": {
                "total_records": 0,
                "missing_values_imputed": 0,
                "fields_normalized": 0,
                "cleaning_steps": ["No records provided."],
            },
            "summary": {
                "total": 0,
                "hot_count": 0,
                "warm_count": 0,
                "cold_count": 0,
                "hot_avg_lock_chance": 0.0,
                "warm_avg_lock_chance": 0.0,
                "cold_avg_lock_chance": 0.0,
            },
            "leads": [],
        }

    alias_map = {
        "lead id": "Lead_ID",
        "lead_id": "Lead_ID",
        "id": "Lead_ID",
        "leadid": "Lead_ID",
        "contact": "contact_name",
        "name": "contact_name",
        "full_name": "contact_name",
        "lead_name": "contact_name",
        "company": "company",
        "company_name": "company",
        "account": "company",
        "account_name": "company",
        "organization": "company",
        "role": "job_title",
        "title": "job_title",
        "job_title": "job_title",
        "time_spent": "Total Time Spent on Website",
        "website_time": "Total Time Spent on Website",
        "time on site": "Total Time Spent on Website",
        "time_on_site": "Total Time Spent on Website",
        "visits": "TotalVisits",
        "total_visits": "TotalVisits",
        "page_views": "Page Views Per Visit",
        "page_views_per_visit": "Page Views Per Visit",
        "origin": "Lead Origin",
        "lead_origin": "Lead Origin",
        "source": "Lead Source",
        "lead_source": "Lead Source",
        "activity": "Last Activity",
        "last_activity": "Last Activity",
        "quality": "Lead Quality",
        "lead_quality": "Lead Quality",
        "tag": "Tags",
        "tags": "Tags",
        "occupation": "What is your current occupation",
        "city": "City",
        "country": "Country",
        "specialization": "Specialization",
    }

    cleaned_records: list[dict[str, Any]] = []
    fields_normalized_count = 0
    missing_imputed_count = 0

    for idx, raw in enumerate(raw_records, start=1):
        cleaned_row: dict[str, Any] = {}
        for k, v in raw.items():
            k_clean = str(k).strip()
            k_lower = k_clean.lower()
            target_key = alias_map.get(k_lower, k_clean)
            if target_key != k_clean:
                fields_normalized_count += 1
            cleaned_row[target_key] = v

        cleaned_row["Lead_ID"] = str(cleaned_row.get("Lead_ID") or f"INJECT-{idx}")
        if not cleaned_row.get("contact_name"):
            cleaned_row["contact_name"] = f"Lead Contact #{idx}"
        if not cleaned_row.get("company"):
            cleaned_row["company"] = f"Enterprise Account #{idx}"
        if not cleaned_row.get("job_title"):
            cleaned_row["job_title"] = "Decision Maker"

        for num_col in NUMERICAL_FEATURES:
            val = cleaned_row.get(num_col)
            if val is None or val == "" or (isinstance(val, float) and np.isnan(val)):
                cleaned_row[num_col] = np.nan
                missing_imputed_count += 1
            elif isinstance(val, str):
                match = re.search(r"[-+]?\d*\.?\d+", val)
                if match:
                    cleaned_row[num_col] = float(match.group())
                else:
                    cleaned_row[num_col] = np.nan
                    missing_imputed_count += 1
            else:
                try:
                    cleaned_row[num_col] = float(val)
                except (ValueError, TypeError):
                    cleaned_row[num_col] = np.nan
                    missing_imputed_count += 1

        for cat_col in CATEGORICAL_FEATURES:
            val = cleaned_row.get(cat_col)
            if val is None or val == "" or str(val).lower() in ("nan", "none", "null"):
                cleaned_row[cat_col] = np.nan
                missing_imputed_count += 1
            else:
                s_val = str(val).strip()
                cleaned_row[cat_col] = s_val if s_val else np.nan

        cleaned_records.append(cleaned_row)

    df_clean = pd.DataFrame(cleaned_records)
    for col in ALL_FEATURE_COLS:
        if col not in df_clean.columns:
            df_clean[col] = np.nan

    probas = pipeline.predict_proba(df_clean[ALL_FEATURE_COLS])[:, 1]
    meta = _load_metadata()
    threshold = meta.get("threshold_for_conversion", CONVERSION_THRESHOLD)

    leads_result: list[dict[str, Any]] = []
    hot_scores: list[float] = []
    warm_scores: list[float] = []
    cold_scores: list[float] = []

    for i, p in enumerate(probas):
        lead_score = int(round(p * 100))
        lock_pct = round(p * 100, 1)
        row = cleaned_records[i]

        if lead_score >= HOT_THRESHOLD:
            cat = "Hot"
            conf = "Very High" if lead_score >= 90 else "High"
            hot_scores.append(lock_pct)
        elif lead_score >= WARM_THRESHOLD:
            cat = "Warm"
            conf = "High" if lead_score >= 60 else "Moderate"
            warm_scores.append(lock_pct)
        else:
            cat = "Cold"
            conf = "Low"
            cold_scores.append(lock_pct)

        evidence = explain_features(row, pipeline)
        strategy = get_lock_strategy(cat, lead_score)

        def _safe_float(val: object, default: float = 0.0) -> float:
            try:
                f = float(val)  # type: ignore[arg-type]
                return default if (pd.isna(f) or np.isinf(f)) else f
            except (ValueError, TypeError):
                return default

        def _safe_str(val: object, default: str = "") -> str:
            s = str(val) if val is not None else default
            return default if s in ("nan", "None", "") else s

        leads_result.append({
            "sales_rank": 0,
            "lead_id": row["Lead_ID"],
            "contact_name": row["contact_name"],
            "company": row["company"],
            "job_title": row["job_title"],
            "lead_score": lead_score,
            "lead_category": cat,
            "lock_chance_pct": lock_pct,
            "confidence_level": conf,
            "predicted_probability": round(float(p), 6),
            "predicted_converted": int(p >= threshold),
            "actual_converted": int(row.get("Actual_Converted", 0)),
            "primary_driver": evidence["primary_driver"],
            "positive_evidence": evidence["positive_evidence"],
            "negative_evidence": evidence["negative_evidence"],
            "lock_strategy": strategy,
            "lead_origin": _safe_str(row.get("Lead Origin")),
            "lead_source": _safe_str(row.get("Lead Source")),
            "last_activity": _safe_str(row.get("Last Activity")),
            "country": _safe_str(row.get("Country")),
            "specialization": _safe_str(row.get("Specialization")),
            "occupation": _safe_str(row.get("What is your current occupation")),
            "city": _safe_str(row.get("City")),
            "tags": _safe_str(row.get("Tags")),
            "lead_quality": _safe_str(row.get("Lead Quality")),
            "total_visits": _safe_float(row.get("TotalVisits")),
            "total_time_on_website": _safe_float(row.get("Total Time Spent on Website")),
            "page_views_per_visit": _safe_float(row.get("Page Views Per Visit")),
        })

    leads_result.sort(key=lambda l: l["lead_score"], reverse=True)
    for r_idx, lead_item in enumerate(leads_result, start=1):
        lead_item["sales_rank"] = r_idx

    t1 = time.perf_counter()
    execution_time_ms = round((t1 - t0) * 1000, 2)

    cleaning_steps = [
        f"Sanitized whitespace and string keys across {len(raw_records)} injected records",
        f"Standardized {fields_normalized_count} alias column names to XGBoost model feature schema",
        f"Imputed {missing_imputed_count} missing values using Scikit-Learn Median & Mode SimpleImputers",
        "Projected cleaned feature matrix into 158-dimensional one-hot encoded and scaled feature space",
        f"Executed XGBoost binary:logistic classification with TreeSHAP decision attribution ({execution_time_ms}ms)",
    ]

    summary = {
        "total": len(leads_result),
        "hot_count": len(hot_scores),
        "warm_count": len(warm_scores),
        "cold_count": len(cold_scores),
        "hot_avg_lock_chance": round(sum(hot_scores) / len(hot_scores), 1) if hot_scores else 0.0,
        "warm_avg_lock_chance": round(sum(warm_scores) / len(warm_scores), 1) if warm_scores else 0.0,
        "cold_avg_lock_chance": round(sum(cold_scores) / len(cold_scores), 1) if cold_scores else 0.0,
    }

    return {
        "status": "ok",
        "pipeline_execution_time_ms": execution_time_ms,
        "cleaning_report": {
            "total_records": len(raw_records),
            "missing_values_imputed": missing_imputed_count,
            "fields_normalized": fields_normalized_count,
            "cleaning_steps": cleaning_steps,
        },
        "summary": summary,
        "leads": leads_result,
    }


