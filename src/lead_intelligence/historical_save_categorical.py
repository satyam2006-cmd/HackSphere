"""Reconstruct categorical codes stored in the recovered 2024 `save.csv`."""

from __future__ import annotations

from typing import Final

import pandas as pd

HISTORICAL_SAVE_FINAL_MODEL_FACTORIZED_FEATURES: Final[tuple[str, ...]] = (
    "Owner_Party_Name",
    "Name",
    "Sales_Territory_Name",
    "Sales_Unit_Name",
)


def reconstruct_historical_save_categorical_codes(
    frame: pd.DataFrame,
) -> pd.DataFrame:
    """Reproduce verified `save.csv` codes for final-model-relevant features.

    The recovered `save.csv` was encoded on the full 86,244-row raw lead table
    before the later final-status cohort filter. `pd.factorize(..., sort=False)`
    reproduces the observed first-seen codes exactly, with missing values stored
    as `-1`. Callers should therefore apply this stage before downstream cohort
    filtering. The input frame is not mutated.
    """
    missing = [
        column
        for column in HISTORICAL_SAVE_FINAL_MODEL_FACTORIZED_FEATURES
        if column not in frame.columns
    ]
    if missing:
        raise ValueError(
            "historical save categorical encoding is missing required columns: "
            + ", ".join(missing)
        )

    reconstructed = frame.copy()
    for column in HISTORICAL_SAVE_FINAL_MODEL_FACTORIZED_FEATURES:
        codes, _ = pd.factorize(reconstructed[column], sort=False)
        reconstructed[column] = pd.Series(
            codes, index=reconstructed.index, dtype="int64"
        )

    return reconstructed
