import numpy as np
import pandas as pd
import pytest

from lead_intelligence.historical_sealing_amount import (
    HISTORICAL_SEALING_AMOUNT_COLUMN,
    HISTORICAL_SEALING_AMOUNT_HIGHER_MIN,
    HISTORICAL_SEALING_AMOUNT_LOWER_MAX,
    recode_historical_sealing_amount,
    reconstruct_historical_sealing_amount_codes,
)


def test_reconstructs_observed_historical_sealing_amount_bands() -> None:
    """Preserve the observed missing, zero, lower-positive, and higher bands."""
    frame = pd.DataFrame(
        {
            HISTORICAL_SEALING_AMOUNT_COLUMN: [
                np.nan,
                0.0,
                8_500.0,
                HISTORICAL_SEALING_AMOUNT_LOWER_MAX,
                HISTORICAL_SEALING_AMOUNT_HIGHER_MIN,
                4_200_000_000.0,
            ]
        }
    )
    original = frame.copy(deep=True)

    reconstructed = reconstruct_historical_sealing_amount_codes(frame)

    assert reconstructed[HISTORICAL_SEALING_AMOUNT_COLUMN].tolist() == [
        -1,
        0,
        1,
        1,
        2,
        2,
    ]
    pd.testing.assert_frame_equal(frame, original)


def test_rejects_values_inside_unrecovered_cutoff_gap() -> None:
    """Do not invent the exact 2024 boundary where the artifacts are silent."""
    with pytest.raises(ValueError, match="unrecovered cutoff gap"):
        recode_historical_sealing_amount(28_000_000.0)


@pytest.mark.parametrize("unsupported", [-1.0, True, "1000", float("inf")])
def test_rejects_unsupported_historical_sealing_amount_values(
    unsupported: object,
) -> None:
    """Reject negative, non-finite, and non-numeric values outside the recovered contract."""
    with pytest.raises(ValueError):
        recode_historical_sealing_amount(unsupported)


def test_requires_historical_sealing_amount_column() -> None:
    """Fail explicitly when the recovered source feature is unavailable."""
    with pytest.raises(ValueError, match=HISTORICAL_SEALING_AMOUNT_COLUMN):
        reconstruct_historical_sealing_amount_codes(pd.DataFrame({"other": [0.0]}))
