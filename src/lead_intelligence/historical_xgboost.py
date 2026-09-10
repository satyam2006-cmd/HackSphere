"""Train, use, and inspect the reconstructed historical XGBoost classifier."""

from __future__ import annotations

import pandas as pd
from xgboost import XGBClassifier

from lead_intelligence.historical_features import HISTORICAL_FINAL_FEATURE_COLUMNS
from lead_intelligence.historical_split import SUPPORTED_HISTORICAL_TARGETS


def fit_historical_xgboost_model(
    x_train: pd.DataFrame,
    y_train: pd.Series,
    *,
    random_state: int = 42,
) -> XGBClassifier:
    """Fit a three-class XGBoost model on the recovered historical feature set."""
    if x_train.empty or y_train.empty:
        raise ValueError("historical XGBoost training data must not be empty")
    if len(x_train) != len(y_train):
        raise ValueError("historical XGBoost features and target must have equal rows")
    if not x_train.index.equals(y_train.index):
        raise ValueError("historical XGBoost features and target indexes must align")
    if tuple(x_train.columns) != HISTORICAL_FINAL_FEATURE_COLUMNS:
        raise ValueError("historical XGBoost features must match the recovered schema")
    if y_train.isna().any():
        raise ValueError("historical XGBoost target must not contain missing values")

    observed_targets = set(y_train.unique())
    if observed_targets != SUPPORTED_HISTORICAL_TARGETS:
        raise ValueError("historical XGBoost target must contain classes 0, 1, and 2")

    non_numeric = x_train.select_dtypes(exclude="number").columns.tolist()
    if non_numeric:
        raise ValueError("historical XGBoost features must be numeric")

    model = XGBClassifier(
        objective="multi:softprob",
        num_class=3,
        n_estimators=100,
        max_depth=6,
        learning_rate=0.3,
        subsample=1.0,
        colsample_bytree=1.0,
        eval_metric="mlogloss",
        tree_method="hist",
        random_state=random_state,
        n_jobs=1,
    )
    model.fit(x_train, y_train.astype("int64"))
    return model


def predict_historical_xgboost_labels(
    model: XGBClassifier,
    x_test: pd.DataFrame,
) -> pd.Series:
    """Predict historical target labels while preserving test-row indexes."""
    if x_test.empty:
        raise ValueError("historical XGBoost prediction data must not be empty")
    if tuple(x_test.columns) != HISTORICAL_FINAL_FEATURE_COLUMNS:
        raise ValueError("historical XGBoost features must match the recovered schema")

    non_numeric = x_test.select_dtypes(exclude="number").columns.tolist()
    if non_numeric:
        raise ValueError("historical XGBoost features must be numeric")

    predictions = pd.Series(
        model.predict(x_test),
        index=x_test.index,
        name="predicted_label",
        dtype="int64",
    )
    if not set(predictions.unique()).issubset(SUPPORTED_HISTORICAL_TARGETS):
        raise ValueError("historical XGBoost predictions must contain only 0, 1, or 2")
    return predictions


def extract_historical_xgboost_feature_importance(
    model: XGBClassifier,
) -> pd.Series:
    """Return fitted XGBoost importances labeled with the recovered feature schema."""
    importances = model.feature_importances_
    if len(importances) != len(HISTORICAL_FINAL_FEATURE_COLUMNS):
        raise ValueError(
            "historical XGBoost feature importance must match the recovered schema"
        )

    feature_names = getattr(model, "feature_names_in_", None)
    if feature_names is None or tuple(feature_names) != HISTORICAL_FINAL_FEATURE_COLUMNS:
        raise ValueError(
            "historical XGBoost feature names must match the recovered schema"
        )

    return pd.Series(
        importances,
        index=HISTORICAL_FINAL_FEATURE_COLUMNS,
        name="feature_importance",
        dtype="float64",
    )
