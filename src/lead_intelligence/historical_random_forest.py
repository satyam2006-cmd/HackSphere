"""Train the reconstructed historical Random Forest classifier."""

from __future__ import annotations

import pandas as pd
from sklearn.ensemble import RandomForestClassifier

from lead_intelligence.historical_features import HISTORICAL_FINAL_FEATURE_COLUMNS
from lead_intelligence.historical_split import SUPPORTED_HISTORICAL_TARGETS


def fit_historical_random_forest_model(
    x_train: pd.DataFrame,
    y_train: pd.Series,
    *,
    random_state: int = 42,
) -> RandomForestClassifier:
    """Fit a three-class Random Forest on the recovered historical feature set."""
    if x_train.empty or y_train.empty:
        raise ValueError("historical Random Forest training data must not be empty")
    if len(x_train) != len(y_train):
        raise ValueError(
            "historical Random Forest features and target must have equal rows"
        )
    if not x_train.index.equals(y_train.index):
        raise ValueError(
            "historical Random Forest features and target indexes must align"
        )
    if tuple(x_train.columns) != HISTORICAL_FINAL_FEATURE_COLUMNS:
        raise ValueError(
            "historical Random Forest features must match the recovered schema"
        )
    if y_train.isna().any():
        raise ValueError(
            "historical Random Forest target must not contain missing values"
        )

    try:
        observed_targets = set(y_train.unique())
    except TypeError as exc:
        raise ValueError(
            "historical Random Forest target must contain classes 0, 1, and 2"
        ) from exc
    if observed_targets != SUPPORTED_HISTORICAL_TARGETS:
        raise ValueError(
            "historical Random Forest target must contain classes 0, 1, and 2"
        )

    non_numeric = x_train.select_dtypes(exclude="number").columns.tolist()
    if non_numeric:
        raise ValueError("historical Random Forest features must be numeric")
    if x_train.isna().any().any():
        raise ValueError(
            "historical Random Forest features must not contain missing values"
        )

    model = RandomForestClassifier(
        n_estimators=100,
        random_state=random_state,
        n_jobs=1,
    )
    model.fit(x_train, y_train.astype("int64"))
    return model
