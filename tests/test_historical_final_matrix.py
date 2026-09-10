import numpy as np
import pandas as pd
import pytest

from lead_intelligence.historical_features import HISTORICAL_FINAL_FEATURE_COLUMNS
from lead_intelligence.historical_final_matrix import (
    assemble_historical_final_modeling_table,
)
from lead_intelligence.historical_target import HISTORICAL_TARGET_COLUMN


def _raw_historical_frame() -> pd.DataFrame:
    """Build synthetic raw rows that exercise recovered stage ordering."""
    return pd.DataFrame(
        {
            "Lead_ID": ["drop", "lead-a", "lead-b", "lead-c", "lead-d"],
            "Status_Text": [
                "Unknown",
                "Converted",
                "Qualified",
                "Closed",
                "Unqualified",
            ],
            "Reason_Code_Text": [None, None, None, "Quote Created", None],
            "Owner_Party_Name": ["owner-first", "owner-second", "owner-first", "owner-third", None],
            "Name": ["name-first", "name-second", "name-first", "name-third", None],
            "Sales_Territory_Name": ["territory-first", "territory-second", "territory-first", "territory-third", None],
            "Sales_Unit_Name": ["sales-first", "sales-second", "sales-first", "sales-third", None],
            "Marketing_Unit_Name": ["marketing-first", "marketing-second", "marketing-first", "marketing-third", None],
            "Approval_Status": [99, 10, 20, 10, np.nan],
            "Consistency_Status": [99, 1, 2, 1, 2],
            "Priority": [99, 3, 1, 3, np.nan],
            "Account_Status": [99, 2, 1, 2, np.nan],
            "Main_Contact_Person_Status": [99, 2, 1, 2, np.nan],
            "Channel": [999, 121, 131, 121, np.nan],
            "Priority_KUT": [999, 121, 131, 121, np.nan],
            "Source": ["drop-source", "source-a", "source-b", "source-a", None],
            "Category": ["drop-category", "cat-a", "cat-b", "cat-a", None],
            "Account_Information_County": [None, False, True, False, True],
            "Start_Date": ["2024-01-01"] * 5,
            "End_Date": [
                "2024-01-02",
                "2024-01-31",
                "9999-12-31",
                "2024-02-01",
                "2024-01-11",
            ],
            "Sealing_Demand_Amount__Currency": [0, 0, 10_000_000, 30_000_000, np.nan],
        }
    )


def test_assembles_recovered_final_feature_matrix_in_stage_order() -> None:
    """Verify the composed pipeline reproduces the recovered ordering contracts."""
    frame = _raw_historical_frame()
    original = frame.copy(deep=True)
    raw_note_scores = [1, 3, 0, 4, None]

    result = assemble_historical_final_modeling_table(frame, raw_note_scores)

    assert result.columns.tolist() == [
        *HISTORICAL_FINAL_FEATURE_COLUMNS,
        HISTORICAL_TARGET_COLUMN,
    ]
    assert len(result) == 4
    assert result[HISTORICAL_TARGET_COLUMN].tolist() == [1, 2, 1, 0]
    assert result["Note_Label"].tolist() == [0, 1, 2, 5]
    assert result["due_day"].tolist() == [30, 69, 31, 10]
    assert result["Sealing_Demand_Amount__Currency"].tolist() == [0, 1, 2, -1]

    # save.csv coding is performed on the full raw table before cohort filtering.
    assert result["Owner_Party_Name"].tolist() == [1, 0, 2, -1]
    # final-table coding is performed after the invalid-status row is removed.
    assert result["Source"].tolist() == [0, 1, 0, -1]
    pd.testing.assert_frame_equal(frame, original)


def test_requires_one_raw_note_score_per_raw_lead_row() -> None:
    """Reject note-score inputs that cannot stay aligned with the raw lead table."""
    with pytest.raises(ValueError, match="one value for each raw lead row"):
        assemble_historical_final_modeling_table(_raw_historical_frame(), [0, 1])
