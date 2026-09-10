"""Reconstruct the final 2024 sealing-demand amount codes."""

from __future__ import annotations

import math
from numbers import Real
from typing import Final

import pandas as pd

HISTORICAL_SEALING_AMOUNT_COLUMN: Final = "Sealing_Demand_Amount__Currency"
HISTORICAL_SEALING_AMOUNT_MISSING_CODE: Final = -1
HISTORICAL_SEALING_AMOUNT_ZERO_CODE: Final = 0
HISTORICAL_SEALING_AMOUNT_LOWER_POSITIVE_CODE: Final = 1
HISTORICAL_SEALING_AMOUNT_HIGHER_POSITIVE_CODE: Final = 2

# The recovered final artifact contains no raw values between these bounds.
# Every observed positive amount at or below the lower bound is stored as 1,
# and every observed amount at or above the upper bound is stored as 2.
# The exact original cutoff/function is not recoverable, so values inside the
# unobserved gap are rejected instead of inventing historical behavior.
HISTORICAL_SEALING_AMOUNT_LOWER_MAX: Final = 27_432_000.0
HISTORICAL_SEALING_AMOUNT_HIGHER_MIN: Final = 29_000_000.0


def recode_historical_sealing_amount(value: object) -> int:
    """Map one recovered sealing-demand amount to its final stored code."""
    if value is None or pd.isna(value):
        return HISTORICAL_SEALING_AMOUNT_MISSING_CODE

    if isinstance(value, bool) or not isinstance(value, Real):
        raise ValueError("historical sealing amount must be numeric or missing")

    amount = float(value)
    if not math.isfinite(amount):
        raise ValueError("historical sealing amount must be finite")
    if amount < 0:
        raise ValueError("historical sealing amount cannot be negative")
    if amount == 0:
        return HISTORICAL_SEALING_AMOUNT_ZERO_CODE
    if amount <= HISTORICAL_SEALING_AMOUNT_LOWER_MAX:
        return HISTORICAL_SEALING_AMOUNT_LOWER_POSITIVE_CODE
    if amount >= HISTORICAL_SEALING_AMOUNT_HIGHER_MIN:
        return HISTORICAL_SEALING_AMOUNT_HIGHER_POSITIVE_CODE

    raise ValueError(
        "historical sealing amount falls inside the unrecovered cutoff gap"
    )


def reconstruct_historical_sealing_amount_codes(frame: pd.DataFrame) -> pd.DataFrame:
    """Recode the recovered sealing-demand feature without mutating the input."""
    if HISTORICAL_SEALING_AMOUNT_COLUMN not in frame.columns:
        raise ValueError(
            "historical sealing reconstruction is missing required column: "
            f"{HISTORICAL_SEALING_AMOUNT_COLUMN}"
        )

    reconstructed = frame.copy()
    reconstructed[HISTORICAL_SEALING_AMOUNT_COLUMN] = pd.Series(
        [
            recode_historical_sealing_amount(value)
            for value in frame[HISTORICAL_SEALING_AMOUNT_COLUMN]
        ],
        index=frame.index,
        dtype="int64",
    )
    return reconstructed
