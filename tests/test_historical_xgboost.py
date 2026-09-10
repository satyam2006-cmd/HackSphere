import pandas as pd
import pytest
from xgboost import XGBClassifier

from lead_intelligence.historical_features import HISTORICAL_FINAL_FEATURE_COLUMNS
from lead_intelligence.historical_xgboost import (
    extract_historical_xgboost_feature_importance,
    fit_historical_xgboost_model,
    predict_historical_xgboost_labels,
)


def _historical_training_split() -> tuple[pd.DataFrame, pd.Series]:
    """Build a small numeric three-class training split with the recovered schema."""
    row_count = 12
    x_train = pd.DataFrame(
        {
            column: [(row + offset) % 7 for row in range(row_count)]
            for offset, column in enumerate(HISTORICAL_FINAL_FEATURE_COLUMNS)
        }
    )
    y_train = pd.Series([0, 1, 2] * 4, name="label", dtype="int64")
    return x_train, y_train


def test_historical_xgboost_fits_three_class_model() -> None:
    """Fit XGBoost on the recovered feature cohort using explicit reconstruction defaults."""
    x_train, y_train = _historical_training_split()

    model = fit_historical_xgboost_model(x_train, y_train, random_state=7)

    assert isinstance(model, XGBClassifier)
    assert model.classes_.tolist() == [0, 1, 2]
    params = model.get_params()
    assert params["objective"] == "multi:softprob"
    assert params["num_class"] == 3
    assert params["random_state"] == 7
    assert len(model.predict(x_train)) == len(x_train)


def test_historical_xgboost_rejects_invalid_training_data() -> None:
    """Reject empty, malformed, non-numeric, or incomplete-class training inputs."""
    x_train, y_train = _historical_training_split()

    with pytest.raises(ValueError, match="must not be empty"):
        fit_historical_xgboost_model(
            pd.DataFrame(columns=HISTORICAL_FINAL_FEATURE_COLUMNS),
            pd.Series(dtype="int64"),
        )

    with pytest.raises(ValueError, match="equal rows"):
        fit_historical_xgboost_model(x_train.iloc[:-1], y_train)

    misaligned_target = y_train.sample(frac=1.0, random_state=7)
    with pytest.raises(ValueError, match="indexes must align"):
        fit_historical_xgboost_model(x_train, misaligned_target)

    wrong_schema = x_train.rename(columns={HISTORICAL_FINAL_FEATURE_COLUMNS[0]: "wrong"})
    with pytest.raises(ValueError, match="recovered schema"):
        fit_historical_xgboost_model(wrong_schema, y_train)

    missing_target = y_train.astype("float64")
    missing_target.iloc[0] = None
    with pytest.raises(ValueError, match="must not contain missing values"):
        fit_historical_xgboost_model(x_train, missing_target)

    missing_class = y_train.replace({2: 1})
    with pytest.raises(ValueError, match="classes 0, 1, and 2"):
        fit_historical_xgboost_model(x_train, missing_class)

    non_numeric = x_train.copy()
    non_numeric[HISTORICAL_FINAL_FEATURE_COLUMNS[0]] = "text"
    with pytest.raises(ValueError, match="features must be numeric"):
        fit_historical_xgboost_model(non_numeric, y_train)


def test_historical_xgboost_predicts_indexed_labels() -> None:
    """Return supported target labels with the original test-row indexes."""
    x_train, y_train = _historical_training_split()
    model = fit_historical_xgboost_model(x_train, y_train, random_state=7)
    x_test = x_train.iloc[[2, 5, 8]].copy()

    predictions = predict_historical_xgboost_labels(model, x_test)

    assert predictions.index.equals(x_test.index)
    assert predictions.name == "predicted_label"
    assert predictions.dtype == "int64"
    assert len(predictions) == len(x_test)
    assert set(predictions.unique()).issubset({0, 1, 2})


def test_historical_xgboost_prediction_rejects_invalid_features() -> None:
    """Reject empty, malformed, or non-numeric prediction feature tables."""
    x_train, y_train = _historical_training_split()
    model = fit_historical_xgboost_model(x_train, y_train)

    with pytest.raises(ValueError, match="prediction data must not be empty"):
        predict_historical_xgboost_labels(
            model,
            pd.DataFrame(columns=HISTORICAL_FINAL_FEATURE_COLUMNS),
        )

    wrong_schema = x_train.rename(columns={HISTORICAL_FINAL_FEATURE_COLUMNS[0]: "wrong"})
    with pytest.raises(ValueError, match="recovered schema"):
        predict_historical_xgboost_labels(model, wrong_schema)

    non_numeric = x_train.copy()
    non_numeric[HISTORICAL_FINAL_FEATURE_COLUMNS[0]] = "text"
    with pytest.raises(ValueError, match="features must be numeric"):
        predict_historical_xgboost_labels(model, non_numeric)


def test_historical_xgboost_extracts_labeled_feature_importance() -> None:
    """Map fitted feature importances onto the recovered 18-feature schema."""
    x_train, y_train = _historical_training_split()
    model = fit_historical_xgboost_model(x_train, y_train, random_state=7)

    importances = extract_historical_xgboost_feature_importance(model)

    assert tuple(importances.index) == HISTORICAL_FINAL_FEATURE_COLUMNS
    assert importances.name == "feature_importance"
    assert importances.dtype == "float64"
    assert len(importances) == len(HISTORICAL_FINAL_FEATURE_COLUMNS)
    assert importances.notna().all()
    assert (importances >= 0).all()


def test_historical_xgboost_feature_importance_rejects_wrong_schema_size() -> None:
    """Reject fitted models whose importance vector does not match 18 features."""
    x_train, y_train = _historical_training_split()
    wrong_model = XGBClassifier(
        objective="multi:softprob",
        num_class=3,
        n_estimators=1,
        max_depth=1,
        eval_metric="mlogloss",
        tree_method="hist",
        random_state=7,
        n_jobs=1,
    )
    wrong_model.fit(x_train.iloc[:, :-1], y_train)

    with pytest.raises(ValueError, match="feature importance must match"):
        extract_historical_xgboost_feature_importance(wrong_model)


def test_historical_xgboost_feature_importance_rejects_reordered_features() -> None:
    """Reject 18-feature models fitted with a different feature order."""
    x_train, y_train = _historical_training_split()
    reordered = x_train.loc[:, tuple(reversed(HISTORICAL_FINAL_FEATURE_COLUMNS))]
    wrong_model = XGBClassifier(
        objective="multi:softprob",
        num_class=3,
        n_estimators=1,
        max_depth=1,
        eval_metric="mlogloss",
        tree_method="hist",
        random_state=7,
        n_jobs=1,
    )
    wrong_model.fit(reordered, y_train)

    with pytest.raises(ValueError, match="feature names must match"):
        extract_historical_xgboost_feature_importance(wrong_model)
