"""Contract tests for the historical prediction API."""

import asyncio

import pandas as pd
from httpx import ASGITransport, AsyncClient

from lead_intelligence.api import app
from lead_intelligence.historical_features import HISTORICAL_FINAL_FEATURE_COLUMNS
from lead_intelligence.historical_xgboost import fit_historical_xgboost_model

_MISSING = object()


def _historical_training_split() -> tuple[pd.DataFrame, pd.Series]:
    """Build a small three-class training split with the recovered schema."""
    row_count = 12
    x_train = pd.DataFrame(
        {
            column: [(row + offset) % 7 for row in range(row_count)]
            for offset, column in enumerate(HISTORICAL_FINAL_FEATURE_COLUMNS)
        }
    )
    y_train = pd.Series([0, 1, 2] * 4, name="label", dtype="int64")
    return x_train, y_train


def _post_prediction(payload: dict[str, object]):
    """Send one prediction request against the in-process ASGI app."""

    async def request_prediction():
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            return await client.post("/historical/predict", json=payload)

    return asyncio.run(request_prediction())


def _restore_historical_model(previous: object) -> None:
    """Restore the historical model state present before a test."""
    if previous is _MISSING:
        if hasattr(app.state, "historical_xgboost_model"):
            del app.state.historical_xgboost_model
        return
    app.state.historical_xgboost_model = previous


def test_historical_prediction_returns_supported_label() -> None:
    """Return the loaded model's deterministic class prediction."""
    x_train, y_train = _historical_training_split()
    model = fit_historical_xgboost_model(x_train, y_train, random_state=7)
    previous = getattr(app.state, "historical_xgboost_model", _MISSING)
    app.state.historical_xgboost_model = model

    payload_features = {
        column: float(x_train.iloc[0][column])
        for column in HISTORICAL_FINAL_FEATURE_COLUMNS
    }
    expected_frame = pd.DataFrame(
        [[payload_features[column] for column in HISTORICAL_FINAL_FEATURE_COLUMNS]],
        columns=HISTORICAL_FINAL_FEATURE_COLUMNS,
    )
    expected_label = int(model.predict(expected_frame)[0])

    try:
        response = _post_prediction({"features": payload_features})
    finally:
        _restore_historical_model(previous)

    assert response.status_code == 200
    assert response.json() == {"predicted_label": expected_label}


def test_historical_prediction_rejects_wrong_schema() -> None:
    """Reject missing or unexpected recovered feature keys."""
    missing_feature_payload = {
        "features": {
            column: 1.0
            for column in HISTORICAL_FINAL_FEATURE_COLUMNS[1:]
        }
    }
    extra_feature_payload = {
        "features": {
            **{
                column: 1.0
                for column in HISTORICAL_FINAL_FEATURE_COLUMNS
            },
            "unexpected_feature": 1.0,
        }
    }

    assert _post_prediction(missing_feature_payload).status_code == 422
    assert _post_prediction(extra_feature_payload).status_code == 422


def test_historical_prediction_rejects_coerced_non_numeric_values() -> None:
    """Reject numeric strings and booleans instead of coercing them to floats."""
    for invalid_value in ("1.0", True):
        features = {
            column: 1.0 for column in HISTORICAL_FINAL_FEATURE_COLUMNS
        }
        features[HISTORICAL_FINAL_FEATURE_COLUMNS[0]] = invalid_value

        response = _post_prediction({"features": features})

        assert response.status_code == 422


def test_historical_prediction_rejects_non_finite_values() -> None:
    """Reject NaN and infinite feature values."""
    for invalid_value in (float("nan"), float("inf"), float("-inf")):
        features = {
            column: 1.0 for column in HISTORICAL_FINAL_FEATURE_COLUMNS
        }
        features[HISTORICAL_FINAL_FEATURE_COLUMNS[0]] = invalid_value

        response = _post_prediction({"features": features})

        assert response.status_code == 422


def test_historical_prediction_requires_loaded_model() -> None:
    """Return service unavailable when no reconstructed model is installed."""
    previous = getattr(app.state, "historical_xgboost_model", _MISSING)
    if hasattr(app.state, "historical_xgboost_model"):
        del app.state.historical_xgboost_model

    try:
        response = _post_prediction(
            {
                "features": {
                    column: 1.0 for column in HISTORICAL_FINAL_FEATURE_COLUMNS
                }
            }
        )
    finally:
        _restore_historical_model(previous)

    assert response.status_code == 503
    assert response.json() == {"detail": "historical XGBoost model is not loaded"}
