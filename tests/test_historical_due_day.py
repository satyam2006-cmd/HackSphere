import pandas as pd
import pytest

from lead_intelligence.historical_due_day import (
    HISTORICAL_DUE_DAY_COLUMN,
    HISTORICAL_OPEN_END_DUE_DAY,
    reconstruct_historical_due_day,
)


def test_reconstructs_historical_due_day_from_mixed_date_formats() -> None:
    """Verify observed date spans and both historical open-end sentinels."""
    frame = pd.DataFrame(
        {
            "Start_Date": ["2023-06-15", "5/23/2023", "2021-05-20", "8/27/2020"],
            "End_Date": ["2023-07-15", "6/30/2023", "9999-12-31", "12/31/9999"],
        }
    )

    reconstructed = reconstruct_historical_due_day(frame)

    assert reconstructed[HISTORICAL_DUE_DAY_COLUMN].tolist() == [
        30,
        38,
        HISTORICAL_OPEN_END_DUE_DAY,
        HISTORICAL_OPEN_END_DUE_DAY,
    ]
    assert HISTORICAL_DUE_DAY_COLUMN not in frame.columns


def test_requires_start_and_end_date_columns() -> None:
    """Verify reconstruction fails when a required historical date column is absent."""
    with pytest.raises(ValueError, match="End_Date"):
        reconstruct_historical_due_day(pd.DataFrame({"Start_Date": ["2023-06-15"]}))


def test_rejects_unrecognized_non_sentinel_dates() -> None:
    """Avoid silently inventing behavior for date values not supported by the artifacts."""
    with pytest.raises(ValueError, match="End_Date"):
        reconstruct_historical_due_day(
            pd.DataFrame(
                {
                    "Start_Date": ["2023-06-15"],
                    "End_Date": ["not-a-date"],
                }
            )
        )
