"""Preserve the strongest recoverable encoding candidate for Marketing_Unit_Name."""

from __future__ import annotations

import pandas as pd

HISTORICAL_MARKETING_UNIT_NAME_COLUMN = "Marketing_Unit_Name"


def infer_historical_marketing_unit_name_codes(frame: pd.DataFrame) -> pd.DataFrame:
    """Infer first-seen codes for the recovered marketing-unit feature.

    The surviving 2024 artifacts do not contain a stored numeric
    ``Marketing_Unit_Name`` column, so this transformation is intentionally
    marked as inferred rather than verified. It follows the first-seen
    factorization pattern that exactly reproduces the other recovered
    categorical preprocessing stages. Missing values are encoded as ``-1``.

    The input frame is not mutated.
    """
    if HISTORICAL_MARKETING_UNIT_NAME_COLUMN not in frame.columns:
        raise ValueError(
            "historical marketing-unit encoding is missing required column: "
            + HISTORICAL_MARKETING_UNIT_NAME_COLUMN
        )

    reconstructed = frame.copy()
    codes, _ = pd.factorize(
        reconstructed[HISTORICAL_MARKETING_UNIT_NAME_COLUMN], sort=False
    )
    reconstructed[HISTORICAL_MARKETING_UNIT_NAME_COLUMN] = pd.Series(
        codes, index=reconstructed.index, dtype="int64"
    )
    return reconstructed
