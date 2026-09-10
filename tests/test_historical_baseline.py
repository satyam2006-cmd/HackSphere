import pandas as pd
import pytest

from lead_intelligence.historical_baseline import fit_historical_prior_baseline


def test_prior_baseline_learns_training_class_priors() -> None:
    """Fit the baseline and expose the empirical class distribution."""
    x_train = pd.DataFrame({"feature": [0, 1, 2, 3, 4, 5]})
    y_train = pd.Series([0, 0, 0, 1, 1, 2], name="label")

    model = fit_historical_prior_baseline(x_train, y_train)

    assert model.strategy == "prior"
    assert model.classes_.tolist() == [0, 1, 2]
    assert model.class_prior_.tolist() == pytest.approx([0.5, 1 / 3, 1 / 6])
    assert model.predict(x_train).tolist() == [0] * len(x_train)


def test_prior_baseline_rejects_invalid_training_data() -> None:
    """Reject empty, misaligned, or missing-target training inputs."""
    with pytest.raises(ValueError, match="must not be empty"):
        fit_historical_prior_baseline(pd.DataFrame(), pd.Series(dtype="int64"))

    with pytest.raises(ValueError, match="equal rows"):
        fit_historical_prior_baseline(
            pd.DataFrame({"feature": [0, 1]}),
            pd.Series([0], name="label"),
        )

    with pytest.raises(ValueError, match="must not contain missing values"):
        fit_historical_prior_baseline(
            pd.DataFrame({"feature": [0, 1]}),
            pd.Series([0, None], name="label"),
        )
