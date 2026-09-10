import pandas as pd
import pytest

from lead_intelligence.historical_save_categorical import (
    HISTORICAL_SAVE_FINAL_MODEL_FACTORIZED_FEATURES,
    reconstruct_historical_save_categorical_codes,
)

EXPECTED_SAVE_FACTORIZED_FEATURES = (
    "Owner_Party_Name",
    "Name",
    "Sales_Territory_Name",
    "Sales_Unit_Name",
)


def test_reconstructs_first_seen_codes_and_missing_sentinel() -> None:
    """Preserve first-seen ordering and the recovered `-1` missing code."""
    frame = pd.DataFrame(
        {
            "Owner_Party_Name": ["owner-a", "owner-b", None, "owner-a"],
            "Name": ["lead-a", None, "lead-b", "lead-a"],
            "Sales_Territory_Name": [
                "territory-b",
                "territory-a",
                "territory-b",
                None,
            ],
            "Sales_Unit_Name": ["unit-x", "unit-x", "unit-y", None],
        }
    )
    original = frame.copy(deep=True)

    reconstructed = reconstruct_historical_save_categorical_codes(frame)

    assert (
        HISTORICAL_SAVE_FINAL_MODEL_FACTORIZED_FEATURES
        == EXPECTED_SAVE_FACTORIZED_FEATURES
    )
    assert reconstructed["Owner_Party_Name"].tolist() == [0, 1, -1, 0]
    assert reconstructed["Name"].tolist() == [0, -1, 1, 0]
    assert reconstructed["Sales_Territory_Name"].tolist() == [0, 1, 0, -1]
    assert reconstructed["Sales_Unit_Name"].tolist() == [0, 0, 1, -1]
    pd.testing.assert_frame_equal(frame, original)


def test_preserves_full_table_codes_before_downstream_filtering() -> None:
    """Keep codes assigned on the full raw table before a later row filter."""
    frame = pd.DataFrame(
        {
            "Owner_Party_Name": ["excluded-owner", "kept-owner", "kept-owner"],
            "Name": ["excluded-lead", "kept-lead", "kept-lead"],
            "Sales_Territory_Name": [
                "excluded-territory",
                "kept-territory",
                "kept-territory",
            ],
            "Sales_Unit_Name": ["excluded-unit", "kept-unit", "kept-unit"],
        }
    )

    reconstructed = reconstruct_historical_save_categorical_codes(frame)
    filtered = reconstructed.iloc[1:]

    for column in EXPECTED_SAVE_FACTORIZED_FEATURES:
        assert filtered[column].tolist() == [1, 1]


def test_requires_all_verified_save_factorized_features() -> None:
    """Fail when one of the verified `save.csv` source fields is absent."""
    frame = pd.DataFrame(
        {
            column: ["value"]
            for column in EXPECTED_SAVE_FACTORIZED_FEATURES
            if column != "Sales_Unit_Name"
        }
    )

    with pytest.raises(ValueError, match="Sales_Unit_Name"):
        reconstruct_historical_save_categorical_codes(frame)
