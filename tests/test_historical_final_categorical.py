import numpy as np
import pandas as pd
import pytest

from lead_intelligence.historical_final_categorical import (
    HISTORICAL_FINAL_FACTORIZED_FEATURES,
    reconstruct_historical_final_categorical_codes,
)

EXPECTED_FACTORIZED_FEATURES = (
    "Approval_Status",
    "Consistency_Status",
    "Priority",
    "Account_Status",
    "Main_Contact_Person_Status",
    "Channel",
    "Priority_KUT",
    "Source",
    "Category",
    "Account_Information_County",
)


def test_reconstructs_first_seen_codes_and_missing_sentinel() -> None:
    """Verify first-seen ordering and the recovered `-1` missing-value code."""
    frame = pd.DataFrame(
        {
            "Approval_Status": [1.0, 2.0, np.nan, 1.0],
            "Consistency_Status": [3.0, 2.0, 3.0, 2.0],
            "Priority": [3.0, 1.0, np.nan, 2.0],
            "Account_Status": [2.0, 1.0, 2.0, np.nan],
            "Main_Contact_Person_Status": [2.0, 1.0, 2.0, np.nan],
            "Channel": [121.0, 131.0, 121.0, np.nan],
            "Priority_KUT": [121.0, 131.0, 141.0, np.nan],
            "Source": ["Z32", "Z04", "Z32", None],
            "Category": ["Z14", "Z15", "Z14", None],
            "Account_Information_County": [False, True, False, True],
        }
    )
    original = frame.copy(deep=True)

    reconstructed = reconstruct_historical_final_categorical_codes(frame)

    assert HISTORICAL_FINAL_FACTORIZED_FEATURES == EXPECTED_FACTORIZED_FEATURES
    assert reconstructed["Approval_Status"].tolist() == [0, 1, -1, 0]
    assert reconstructed["Consistency_Status"].tolist() == [0, 1, 0, 1]
    assert reconstructed["Priority"].tolist() == [0, 1, -1, 2]
    assert reconstructed["Account_Status"].tolist() == [0, 1, 0, -1]
    assert reconstructed["Main_Contact_Person_Status"].tolist() == [0, 1, 0, -1]
    assert reconstructed["Channel"].tolist() == [0, 1, 0, -1]
    assert reconstructed["Priority_KUT"].tolist() == [0, 1, 2, -1]
    assert reconstructed["Source"].tolist() == [0, 1, 0, -1]
    assert reconstructed["Category"].tolist() == [0, 1, 0, -1]
    assert reconstructed["Account_Information_County"].tolist() == [0, 1, 0, 1]
    pd.testing.assert_frame_equal(frame, original)


def test_requires_all_verified_final_factorized_features() -> None:
    """Avoid inventing codes when a verified final input column is absent."""
    frame = pd.DataFrame(
        {column: [0] for column in EXPECTED_FACTORIZED_FEATURES if column != "Source"}
    )

    with pytest.raises(ValueError, match="Source"):
        reconstruct_historical_final_categorical_codes(frame)
