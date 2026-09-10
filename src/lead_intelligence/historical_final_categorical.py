"""Reconstruct categorical codes stored in the final 2024 modeling table."""

from __future__ import annotations

from typing import Final

import pandas as pd

HISTORICAL_FINAL_FACTORIZED_FEATURES: Final[tuple[str, ...]] = (
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


def reconstruct_historical_final_categorical_codes(
    frame: pd.DataFrame,
) -> pd.DataFrame:
    """Reproduce first-seen categorical codes observed in `jiho_feature.csv`.

    Missing values are encoded as `-1`, matching the recovered final artifact.
    The input frame is not mutated.
    """
    missing = [
        column
        for column in HISTORICAL_FINAL_FACTORIZED_FEATURES
        if column not in frame.columns
    ]
    if missing:
        raise ValueError(
            "historical final categorical encoding is missing required columns: "
            + ", ".join(missing)
        )

    reconstructed = frame.copy()
    for column in HISTORICAL_FINAL_FACTORIZED_FEATURES:
        codes, _ = pd.factorize(reconstructed[column], sort=False)
        reconstructed[column] = pd.Series(
            codes, index=reconstructed.index, dtype="int64"
        )

    return reconstructed
