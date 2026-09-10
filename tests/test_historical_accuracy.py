import pandas as pd
import pytest

from lead_intelligence.historical_accuracy import calculate_historical_accuracy


def test_historical_accuracy_returns_fraction_correct() -> None:
    """Calculate the fraction of aligned historical labels predicted correctly."""
    y_true = pd.Series([0, 1, 2, 1], index=[10, 11, 12, 13], dtype="int64")
    y_pred = pd.Series([0, 2, 2, 1], index=[10, 11, 12, 13], dtype="int64")

    assert calculate_historical_accuracy(y_true, y_pred) == pytest.approx(0.75)


def test_historical_accuracy_rejects_invalid_labels() -> None:
    """Reject empty, misaligned, missing, or unsupported historical labels."""
    y_true = pd.Series([0, 1, 2], index=[10, 11, 12], dtype="int64")
    y_pred = pd.Series([0, 1, 2], index=[10, 11, 12], dtype="int64")

    with pytest.raises(ValueError, match="must not be empty"):
        calculate_historical_accuracy(
            pd.Series(dtype="int64"),
            pd.Series(dtype="int64"),
        )

    with pytest.raises(ValueError, match="equal rows"):
        calculate_historical_accuracy(y_true.iloc[:-1], y_pred)

    with pytest.raises(ValueError, match="indexes must align"):
        calculate_historical_accuracy(y_true, y_pred.sample(frac=1.0, random_state=7))

    missing = y_pred.astype("float64")
    missing.iloc[0] = None
    with pytest.raises(ValueError, match="must not contain missing values"):
        calculate_historical_accuracy(y_true, missing)

    unsupported_true = y_true.copy()
    unsupported_true.iloc[0] = 3
    with pytest.raises(ValueError, match="true labels must contain only"):
        calculate_historical_accuracy(unsupported_true, y_pred)

    unsupported_pred = y_pred.copy()
    unsupported_pred.iloc[0] = 3
    with pytest.raises(ValueError, match="predicted labels must contain only"):
        calculate_historical_accuracy(y_true, unsupported_pred)

    unhashable_true = pd.Series([[0], 1, 2], index=y_true.index, dtype="object")
    with pytest.raises(ValueError, match="true labels must contain only"):
        calculate_historical_accuracy(unhashable_true, y_pred)

    unhashable_pred = pd.Series([[0], 1, 2], index=y_pred.index, dtype="object")
    with pytest.raises(ValueError, match="predicted labels must contain only"):
        calculate_historical_accuracy(y_true, unhashable_pred)
