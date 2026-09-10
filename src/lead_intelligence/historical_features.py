"""Preserve the final 2024 model feature cohort recovered from artifacts."""

from __future__ import annotations

from typing import Final

import pandas as pd

from lead_intelligence.historical_target import HISTORICAL_TARGET_COLUMN

# The order below follows the final XGBoost feature-importance slide.
# It is a deterministic reconstruction order, not a claim that the original
# training matrix used this exact column order.
HISTORICAL_FINAL_FEATURE_COLUMNS: Final[tuple[str, ...]] = (
    "Owner_Party_Name",
    "Sales_Territory_Name",
    "Name",
    "Sales_Unit_Name",
    "Source",
    "Note_Label",
    "Channel",
    "Marketing_Unit_Name",
    "Main_Contact_Person_Status",
    "Priority_KUT",
    "due_day",
    "Account_Status",
    "Approval_Status",
    "Category",
    "Sealing_Demand_Amount__Currency",
    "Account_Information_County",
    "Consistency_Status",
    "Priority",
)


def select_final_modeling_columns(frame: pd.DataFrame) -> pd.DataFrame:
    """Select the recovered final feature cohort together with its target."""
    required = (*HISTORICAL_FINAL_FEATURE_COLUMNS, HISTORICAL_TARGET_COLUMN)
    missing = [column for column in required if column not in frame.columns]
    if missing:
        raise ValueError(
            f"historical modeling table is missing required columns: {', '.join(missing)}"
        )

    return frame.loc[:, required].copy()
