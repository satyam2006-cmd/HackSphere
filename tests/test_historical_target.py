import pandas as pd
import pytest

from lead_intelligence.historical_target import (
    HISTORICAL_TARGET_COLUMN,
    reconstruct_final_three_class_target,
)


def test_reconstructs_final_three_class_target_and_drops_invalid_statuses() -> None:
    leads = pd.DataFrame(
        {
            "ObjectID": ["A", "B", "C", "D", "E", "F", "G", "H"],
            "Status_Text": [
                "Converted",
                "Closed",
                "Qualified",
                "Closed",
                "Unqualified",
                "Sales Rejected",
                None,
                "0",
            ],
            "Reason_Code_Text": [
                None,
                "Quote Created",
                None,
                "No Potential",
                None,
                None,
                None,
                None,
            ],
        }
    )

    reconstructed = reconstruct_final_three_class_target(leads)

    assert reconstructed["ObjectID"].tolist() == ["A", "B", "C", "D", "E", "F"]
    assert reconstructed[HISTORICAL_TARGET_COLUMN].tolist() == [1, 1, 2, 0, 0, 0]
    assert HISTORICAL_TARGET_COLUMN not in leads.columns


def test_requires_status_reason_and_object_id_columns() -> None:
    with pytest.raises(ValueError, match="Reason_Code_Text"):
        reconstruct_final_three_class_target(
            pd.DataFrame({"ObjectID": ["A"], "Status_Text": ["Converted"]})
        )
