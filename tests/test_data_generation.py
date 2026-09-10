import pandas as pd
import pytest

from lead_intelligence.data_generation import generate_synthetic_crm
from lead_intelligence.data_schema import LEAD_COLUMNS, LEAD_NOTE_COLUMNS
from lead_intelligence.historical_profile import (
    NOTE_PRESENCE_RATE,
    RAW_DOT_NOTE_RATE,
    SOURCE_COUNTS,
    STATUS_COUNTS,
    WORKING_MISSING_RATES,
)


def test_generator_is_reproducible() -> None:
    first = generate_synthetic_crm(120, seed=7)
    second = generate_synthetic_crm(120, seed=7)
    pd.testing.assert_frame_equal(first.leads, second.leads)
    pd.testing.assert_frame_equal(first.lead_notes, second.lead_notes)


def test_generator_reconstructs_raw_relationship() -> None:
    generated = generate_synthetic_crm(500, seed=11)
    leads = generated.leads
    notes = generated.lead_notes

    assert list(leads.columns) == list(LEAD_COLUMNS)
    assert list(notes.columns) == list(LEAD_NOTE_COLUMNS)
    assert leads["ObjectID"].is_unique
    assert notes["ObjectID"].is_unique
    assert set(notes["ParentObjectID"]).issubset(set(leads["ObjectID"]))
    assert set(leads["Status_Text"].unique()).issubset(STATUS_COUNTS)
    assert set(leads["Source_Text"].unique()).issubset(SOURCE_COUNTS)


def test_some_leads_have_no_notes_like_historical_inner_join() -> None:
    generated = generate_synthetic_crm(2_000, seed=19)
    parents = set(generated.lead_notes["ParentObjectID"])
    observed_rate = generated.leads["ObjectID"].isin(parents).mean()

    assert 0.88 < observed_rate < 0.94
    assert abs(observed_rate - NOTE_PRESENCE_RATE) < 0.03


def test_default_profile_tracks_public_aggregate_rates() -> None:
    generated = generate_synthetic_crm(20_000, seed=31)
    leads = generated.leads
    notes = generated.lead_notes

    expected_status = pd.Series(STATUS_COUNTS, dtype=float)
    expected_status /= expected_status.sum()
    observed_status = leads["Status_Text"].value_counts(normalize=True)
    for label, expected in expected_status.items():
        assert abs(observed_status[label] - expected) < 0.015

    assert (
        abs(
            leads["Sales_Unit_Name"].isna().mean()
            - WORKING_MISSING_RATES["Sales_Unit_Name"]
        )
        < 0.02
    )
    assert (
        abs(
            leads["Sales_Territory_Name"].isna().mean()
            - WORKING_MISSING_RATES["Sales_Territory_Name"]
        )
        < 0.02
    )
    assert (
        abs(notes["Text"].isna().mean() - WORKING_MISSING_RATES["Text"])
        < 0.0015
    )


def test_dot_placeholder_rate_tracks_raw_aggregate() -> None:
    generated = generate_synthetic_crm(100_000, seed=37)
    observed_dot_rate = generated.leads["Note"].fillna("").eq(".").mean()

    # At p ~= 1.6% and n = 100k, 0.0012 is about three standard errors.
    # The previous conditional-draw bug missed the target by about 0.0017.
    assert abs(observed_dot_rate - RAW_DOT_NOTE_RATE) < 0.0012


def test_public_records_are_clearly_synthetic() -> None:
    generated = generate_synthetic_crm(200, seed=23, missing_rate=0.0)
    assert generated.leads["ObjectID"].str.startswith("SYNTH-LEAD-").all()
    assert generated.leads["Account_Party_Name"].str.startswith(
        "Synthetic Account "
    ).all()
    assert generated.leads["Owner_Party_Name"].str.startswith(
        "Synthetic Owner "
    ).all()
    assert generated.lead_notes["ObjectID"].str.startswith("SYNTH-NOTE-").all()


def test_generator_rejects_invalid_arguments() -> None:
    with pytest.raises(ValueError):
        generate_synthetic_crm(10)
    with pytest.raises(ValueError):
        generate_synthetic_crm(100, missing_rate=0.99)
    with pytest.raises(ValueError):
        generate_synthetic_crm(100, max_notes_per_lead=0)
