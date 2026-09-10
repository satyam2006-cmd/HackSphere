"""Reconstruct the final 2024 three-class lead target from recovered artifacts."""

from __future__ import annotations

from typing import Final

import pandas as pd

from lead_intelligence.data_schema import CONVERTED_STATUS, ID_COLUMN, STATUS_COLUMN

HISTORICAL_TARGET_COLUMN: Final = "label"
REASON_COLUMN: Final = "Reason_Code_Text"
QUOTE_CREATED_REASON: Final = "Quote Created"
HISTORICAL_FINAL_STATUSES: Final[tuple[str, ...]] = (
    "Closed",
    "Unqualified",
    CONVERTED_STATUS,
    "Qualified",
    "Sales Rejected",
)


def reconstruct_final_three_class_target(leads: pd.DataFrame) -> pd.DataFrame:
    """Reproduce the final three-class target recovered from 2024 artifacts."""
    required = (ID_COLUMN, STATUS_COLUMN, REASON_COLUMN)
    missing = [column for column in required if column not in leads.columns]
    if missing:
        raise ValueError(f"leads is missing required columns: {', '.join(missing)}")

    modeled = leads.loc[leads[STATUS_COLUMN].isin(HISTORICAL_FINAL_STATUSES)].copy()
    modeled[HISTORICAL_TARGET_COLUMN] = 0

    class_one = modeled[STATUS_COLUMN].eq(CONVERTED_STATUS) | (
        modeled[STATUS_COLUMN].eq("Closed")
        & modeled[REASON_COLUMN].eq(QUOTE_CREATED_REASON)
    )
    class_two = modeled[STATUS_COLUMN].eq("Qualified")

    modeled.loc[class_one, HISTORICAL_TARGET_COLUMN] = 1
    modeled.loc[class_two, HISTORICAL_TARGET_COLUMN] = 2
    modeled[HISTORICAL_TARGET_COLUMN] = modeled[HISTORICAL_TARGET_COLUMN].astype("int8")
    return modeled.reset_index(drop=True)
