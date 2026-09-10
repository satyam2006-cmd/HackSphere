import pandas as pd
import pytest

from lead_intelligence.historical_features import (
    HISTORICAL_FINAL_FEATURE_COLUMNS,
    select_final_modeling_columns,
)
from lead_intelligence.historical_target import HISTORICAL_TARGET_COLUMN

EXPECTED_FINAL_FEATURE_COLUMNS = (
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


def _historical_modeling_frame() -> pd.DataFrame:
    """Build a synthetic modeling table with deliberately reversed feature order."""
    input_feature_order = tuple(reversed(EXPECTED_FINAL_FEATURE_COLUMNS))
    data = {
        column: [index, index + 100]
        for index, column in enumerate(input_feature_order)
    }
    data[HISTORICAL_TARGET_COLUMN] = [0, 1]
    data["unused_column"] = ["ignore", "ignore"]
    return pd.DataFrame(data)


def test_selects_only_recovered_final_features_and_target() -> None:
    """Verify the selector preserves the independent 18-feature contract."""
    frame = _historical_modeling_frame()

    selected = select_final_modeling_columns(frame)

    assert HISTORICAL_FINAL_FEATURE_COLUMNS == EXPECTED_FINAL_FEATURE_COLUMNS
    assert len(EXPECTED_FINAL_FEATURE_COLUMNS) == 18
    assert selected.columns.tolist() == [
        *EXPECTED_FINAL_FEATURE_COLUMNS,
        HISTORICAL_TARGET_COLUMN,
    ]
    assert "unused_column" not in selected.columns
    assert selected.equals(frame.loc[:, selected.columns])


def test_requires_every_recovered_final_feature() -> None:
    """Verify selection fails when one recovered historical feature is absent."""
    frame = _historical_modeling_frame().drop(columns=["Note_Label"])

    with pytest.raises(ValueError, match="Note_Label"):
        select_final_modeling_columns(frame)
