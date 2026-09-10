"""Calculate accuracy for reconstructed historical label predictions."""

from __future__ import annotations

import pandas as pd
from sklearn.metrics import accuracy_score

from lead_intelligence.historical_split import SUPPORTED_HISTORICAL_TARGETS


def calculate_historical_accuracy(
    y_true: pd.Series,
    y_pred: pd.Series,
) -> float:
    """Return classification accuracy for aligned historical target labels."""
    if y_true.empty or y_pred.empty:
        raise ValueError("historical accuracy labels must not be empty")
    if len(y_true) != len(y_pred):
        raise ValueError("historical accuracy labels must have equal rows")
    if not y_true.index.equals(y_pred.index):
        raise ValueError("historical accuracy label indexes must align")
    if y_true.isna().any() or y_pred.isna().any():
        raise ValueError("historical accuracy labels must not contain missing values")

    try:
        true_labels = set(y_true.unique())
    except TypeError as exc:
        raise ValueError("historical true labels must contain only 0, 1, or 2") from exc
    if not true_labels.issubset(SUPPORTED_HISTORICAL_TARGETS):
        raise ValueError("historical true labels must contain only 0, 1, or 2")

    try:
        predicted_labels = set(y_pred.unique())
    except TypeError as exc:
        raise ValueError(
            "historical predicted labels must contain only 0, 1, or 2"
        ) from exc
    if not predicted_labels.issubset(SUPPORTED_HISTORICAL_TARGETS):
        raise ValueError("historical predicted labels must contain only 0, 1, or 2")

    return float(accuracy_score(y_true, y_pred))
