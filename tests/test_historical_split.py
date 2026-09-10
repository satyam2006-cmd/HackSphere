import pandas as pd
import pytest

from lead_intelligence.historical_features import HISTORICAL_FINAL_FEATURE_COLUMNS
from lead_intelligence.historical_split import split_historical_modeling_table
from lead_intelligence.historical_target import HISTORICAL_TARGET_COLUMN


def _balanced_modeling_table(rows_per_class: int = 10) -> pd.DataFrame:
    """Build a balanced synthetic final modeling table for split tests."""
    row_count = rows_per_class * 3
    frame = pd.DataFrame(
        {
            column: [(row + offset) % 5 for row in range(row_count)]
            for offset, column in enumerate(HISTORICAL_FINAL_FEATURE_COLUMNS)
        }
    )
    frame[HISTORICAL_TARGET_COLUMN] = (
        [0] * rows_per_class + [1] * rows_per_class + [2] * rows_per_class
    )
    return frame


def test_split_is_deterministic_and_stratified() -> None:
    """Return identical splits for a seed while preserving class proportions."""
    frame = _balanced_modeling_table()

    first = split_historical_modeling_table(frame, random_state=7)
    second = split_historical_modeling_table(frame, random_state=7)

    pd.testing.assert_frame_equal(first[0], second[0])
    pd.testing.assert_frame_equal(first[1], second[1])
    pd.testing.assert_series_equal(first[2], second[2])
    pd.testing.assert_series_equal(first[3], second[3])

    _, _, y_train, y_test = first
    assert y_train.value_counts().sort_index().tolist() == [8, 8, 8]
    assert y_test.value_counts().sort_index().tolist() == [2, 2, 2]


def test_split_does_not_mutate_input() -> None:
    """Leave the supplied modeling table unchanged after splitting."""
    frame = _balanced_modeling_table()
    original = frame.copy(deep=True)

    split_historical_modeling_table(frame)

    pd.testing.assert_frame_equal(frame, original)


def test_split_rejects_invalid_inputs() -> None:
    """Reject incomplete schemas, invalid labels, and unsplittable classes."""
    missing_feature = _balanced_modeling_table().drop(
        columns=[HISTORICAL_FINAL_FEATURE_COLUMNS[0]]
    )
    with pytest.raises(ValueError, match="missing required columns"):
        split_historical_modeling_table(missing_feature)

    duplicate_feature = pd.concat(
        [
            _balanced_modeling_table().loc[:, [HISTORICAL_FINAL_FEATURE_COLUMNS[0]]],
            _balanced_modeling_table(),
        ],
        axis=1,
    )
    with pytest.raises(ValueError, match="exactly the recovered 18 features"):
        split_historical_modeling_table(duplicate_feature)

    missing_target = _balanced_modeling_table()
    missing_target.loc[0, HISTORICAL_TARGET_COLUMN] = None
    with pytest.raises(ValueError, match="target must not contain missing values"):
        split_historical_modeling_table(missing_target)

    invalid_target = _balanced_modeling_table()
    invalid_target[HISTORICAL_TARGET_COLUMN] = (
        [0.9] * 10 + [1.9] * 10 + [2.9] * 10
    )
    with pytest.raises(ValueError, match="only 0, 1, or 2"):
        split_historical_modeling_table(invalid_target)

    too_small = _balanced_modeling_table(rows_per_class=1)
    with pytest.raises(ValueError, match="at least two rows"):
        split_historical_modeling_table(too_small)


def test_split_rejects_partition_missing_a_class() -> None:
    """Reject a nominally stratified split if one class disappears from test."""
    class_counts = [2, 100, 100]
    row_count = sum(class_counts)
    frame = pd.DataFrame(
        {
            column: [(row + offset) % 5 for row in range(row_count)]
            for offset, column in enumerate(HISTORICAL_FINAL_FEATURE_COLUMNS)
        }
    )
    frame[HISTORICAL_TARGET_COLUMN] = (
        [0] * class_counts[0] + [1] * class_counts[1] + [2] * class_counts[2]
    )

    with pytest.raises(ValueError, match="preserve every target class"):
        split_historical_modeling_table(
            frame,
            test_size=3 / row_count,
            random_state=42,
        )
