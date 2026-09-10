"""Create reproducible train/test splits for the recovered modeling table."""

from __future__ import annotations

from math import ceil

import pandas as pd
from sklearn.model_selection import train_test_split

from lead_intelligence.historical_features import HISTORICAL_FINAL_FEATURE_COLUMNS
from lead_intelligence.historical_target import HISTORICAL_TARGET_COLUMN

SUPPORTED_HISTORICAL_TARGETS = frozenset({0, 1, 2})


def split_historical_modeling_table(
    frame: pd.DataFrame,
    *,
    test_size: float = 0.2,
    random_state: int = 42,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    """Create a deterministic stratified split from the recovered final table."""
    if not 0 < test_size < 1:
        raise ValueError("test_size must be between 0 and 1")

    required = (*HISTORICAL_FINAL_FEATURE_COLUMNS, HISTORICAL_TARGET_COLUMN)
    missing = [column for column in required if column not in frame.columns]
    if missing:
        raise ValueError(
            "historical modeling table is missing required columns: "
            + ", ".join(missing)
        )
    if len(frame.columns) != len(required):
        raise ValueError(
            "historical modeling table must contain exactly the recovered "
            "18 features and target"
        )
    if frame.empty:
        raise ValueError("historical modeling table must not be empty")

    raw_target = frame[HISTORICAL_TARGET_COLUMN]
    if raw_target.isna().any():
        raise ValueError("historical modeling target must not contain missing values")

    observed_targets = set(raw_target.unique())
    if not observed_targets.issubset(SUPPORTED_HISTORICAL_TARGETS):
        raise ValueError("historical modeling target must contain only 0, 1, or 2")

    class_counts = raw_target.value_counts()
    if len(class_counts) < 2:
        raise ValueError("historical modeling target must contain at least two classes")
    if int(class_counts.min()) < 2:
        raise ValueError(
            "each target class must contain at least two rows for a stratified split"
        )

    class_count = len(class_counts)
    test_rows = ceil(len(frame) * test_size)
    train_rows = len(frame) - test_rows
    if min(train_rows, test_rows) < class_count:
        raise ValueError(
            "train and test partitions must each have at least one row per target class"
        )

    features = frame.loc[:, HISTORICAL_FINAL_FEATURE_COLUMNS].copy()
    target = raw_target.astype("int64").copy()

    x_train, x_test, y_train, y_test = train_test_split(
        features,
        target,
        test_size=test_size,
        random_state=random_state,
        stratify=target,
    )

    expected_classes = set(target.unique())
    if set(y_train.unique()) != expected_classes or set(y_test.unique()) != expected_classes:
        raise ValueError(
            "stratified split must preserve every target class in train and test"
        )

    return x_train, x_test, y_train, y_test
