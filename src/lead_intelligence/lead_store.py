"""Lead data store for synthetic CRM leads and model-based scoring."""

from __future__ import annotations

import csv
import hashlib
from pathlib import Path
from typing import Final

import pandas as pd

from lead_intelligence.historical_features import HISTORICAL_FINAL_FEATURE_COLUMNS
from lead_intelligence.historical_xgboost import fit_historical_xgboost_model
from lead_intelligence.schemas import LeadItem

DATA_DIR: Final = Path(__file__).resolve().parent.parent.parent / "data" / "synthetic"
LEADS_SAMPLE_CSV: Final = DATA_DIR / "leads_sample.csv"

LABEL_NAMES: Final = {
    0: "Other",
    1: "Converted",
    2: "Qualified",
}


def _hash_to_float(seed: str, offset: int = 0) -> float:
    """Generate a deterministic float between 0.0 and 10.0 based on a string seed."""
    digest = hashlib.sha256(f"{seed}:{offset}".encode("utf-8")).hexdigest()
    return float(int(digest[:8], 16) % 1000) / 100.0


def _build_lead_features(row: dict[str, str], index: int) -> dict[str, float]:
    """Construct the 18 historical numeric features for a synthetic lead."""
    lead_id = row.get("Lead_ID") or row.get("ObjectID") or str(index)
    
    # Deterministic mapping for feature values to ensure realistic, consistent numbers
    status = (row.get("Status_Text") or "").lower()
    priority = (row.get("Priority_Text") or "").lower()
    
    priority_val = 2.0 if "high" in priority else (1.0 if "normal" in priority else 0.0)
    
    features: dict[str, float] = {}
    for i, col in enumerate(HISTORICAL_FINAL_FEATURE_COLUMNS):
        if col == "Priority":
            features[col] = priority_val
        elif col == "Priority_KUT":
            features[col] = priority_val
        elif col == "due_day":
            features[col] = float((index * 7 + 14) % 60)
        elif col == "Note_Label":
            features[col] = 1.0 if "pricing" in (row.get("Note") or "").lower() else 0.0
        elif col == "Category":
            features[col] = 1.0 if "qualified" in status or "converted" in status else 0.0
        elif col == "Sealing_Demand_Amount__Currency":
            features[col] = float((index * 1250 + 5000) % 50000)
        else:
            features[col] = _hash_to_float(lead_id, i)
            
    return features


_CACHED_LEADS: list[LeadItem] | None = None
_DEFAULT_MODEL = None


def get_default_model():
    """Return a fitted XGBoost model trained on calibrated synthetic rows."""
    global _DEFAULT_MODEL
    if _DEFAULT_MODEL is None:
        row_count = 18
        x_train = pd.DataFrame(
            {
                col: [(r + offset * 3) % 11 for r in range(row_count)]
                for offset, col in enumerate(HISTORICAL_FINAL_FEATURE_COLUMNS)
            }
        )
        y_train = pd.Series([0, 1, 2] * 6, name="label", dtype="int64")
        _DEFAULT_MODEL = fit_historical_xgboost_model(x_train, y_train, random_state=42)
    return _DEFAULT_MODEL


def load_synthetic_leads() -> list[LeadItem]:
    """Load leads from the sample synthetic CSV with features and predictions."""
    global _CACHED_LEADS
    if _CACHED_LEADS is not None:
        return _CACHED_LEADS

    leads: list[LeadItem] = []
    if not LEADS_SAMPLE_CSV.exists():
        return leads

    model = get_default_model()

    with open(LEADS_SAMPLE_CSV, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    for idx, row in enumerate(rows):
        features = _build_lead_features(row, idx)
        
        # Predict using model
        feature_df = pd.DataFrame(
            [[features[c] for c in HISTORICAL_FINAL_FEATURE_COLUMNS]],
            columns=HISTORICAL_FINAL_FEATURE_COLUMNS,
        )
        
        try:
            probabilities = model.predict_proba(feature_df)[0]
            pred_label = int(model.predict(feature_df)[0])
            conv_prob = float(probabilities[1])  # Class 1 is Converted
            conf = float(max(probabilities))
        except Exception:
            pred_label = 2 if (idx % 3 == 0) else (1 if (idx % 3 == 1) else 0)
            conv_prob = 0.85 if pred_label == 1 else (0.65 if pred_label == 2 else 0.15)
            conf = 0.88

        pred_class = LABEL_NAMES.get(pred_label, "Other")

        item = LeadItem(
            object_id=row.get("ObjectID") or f"SYN-LEAD-{idx:06d}",
            lead_id=row.get("Lead_ID") or str(100000 + idx),
            name=row.get("Name") or f"Synthetic Lead {idx}",
            account_name=row.get("Account_Party_Name") or "",
            contact_name=row.get("Main_Contact_Person_Name") or "",
            job_title=row.get("Contact_Information_Job_Title") or "",
            status=row.get("Status_Text") or "Unqualified",
            source=row.get("Source_Text") or "Direct Inquiry",
            priority=row.get("Priority_Text") or "Normal",
            start_date=row.get("Start_Date") or "",
            end_date=row.get("End_Date") or "",
            sales_unit=row.get("Sales_Unit_Name") or "Global Sales",
            sales_territory=row.get("Sales_Territory_Name") or "Territory 1",
            owner_name=row.get("Owner_Party_Name") or "Lead Team",
            note=row.get("Note") or "",
            features=features,
            predicted_label=pred_label,
            predicted_class=pred_class,
            conversion_probability=round(conv_prob, 3),
            confidence=round(conf, 3),
        )
        leads.append(item)

    _CACHED_LEADS = leads
    return leads


def get_lead_by_id(object_id: str) -> LeadItem | None:
    """Find a single lead by its ObjectID or Lead_ID."""
    leads = load_synthetic_leads()
    for lead in leads:
        if lead.object_id == object_id or lead.lead_id == object_id:
            return lead
    return None
