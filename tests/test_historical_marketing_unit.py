import numpy as np
import pandas as pd
import pytest

from lead_intelligence.historical_marketing_unit import (
    HISTORICAL_MARKETING_UNIT_NAME_COLUMN,
    infer_historical_marketing_unit_name_codes,
)


def test_infers_first_seen_codes_and_missing_sentinel() -> None:
    """Verify first-seen codes, the `-1` missing sentinel, and input immutability."""
    frame = pd.DataFrame(
        {
            "Marketing_Unit_Name": [
                np.nan,
                "unit-a",
                "unit-b",
                "unit-a",
                None,
                "unit-c",
            ]
        }
    )
    original = frame.copy(deep=True)

    reconstructed = infer_historical_marketing_unit_name_codes(frame)

    assert HISTORICAL_MARKETING_UNIT_NAME_COLUMN == "Marketing_Unit_Name"
    assert reconstructed["Marketing_Unit_Name"].tolist() == [-1, 0, 1, 0, -1, 2]
    pd.testing.assert_frame_equal(frame, original)


def test_requires_marketing_unit_name_column() -> None:
    """Reject frames that cannot support the inferred historical encoding stage."""
    with pytest.raises(ValueError, match="Marketing_Unit_Name"):
        infer_historical_marketing_unit_name_codes(pd.DataFrame({"other": [1]}))
