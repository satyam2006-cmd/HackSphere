"""Train a simple prior baseline for the reconstructed historical pipeline."""

from __future__ import annotations

import pandas as pd
from sklearn.dummy import DummyClassifier


def fit_historical_prior_baseline(
    x_train: pd.DataFrame,
    y_train: pd.Series,
) -> DummyClassifier:
    """Fit a class-prior dummy classifier on an already prepared training split."""
    if x_train.empty or y_train.empty:
        raise ValueError("historical baseline training data must not be empty")
    if len(x_train) != len(y_train):
        raise ValueError("historical baseline features and target must have equal rows")
    if y_train.isna().any():
        raise ValueError("historical baseline target must not contain missing values")

    model = DummyClassifier(strategy="prior")
    model.fit(x_train, y_train)
    return model
