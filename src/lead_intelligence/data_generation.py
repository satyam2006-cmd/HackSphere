"""Calibrated, privacy-safe synthetic reconstruction of the 2024 CRM workflow."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from lead_intelligence.data_schema import LEAD_COLUMNS, LEAD_NOTE_COLUMNS
from lead_intelligence.historical_profile import (
    EXTRA_NOTE_POISSON_LAMBDA,
    HISTORICAL_JOINED_LEADS,
    JOB_TITLE_CARDINALITY,
    JOB_TITLE_TOP_COUNTS,
    NAME_LANGUAGE_COUNTS,
    NAME_LANGUAGE_MISSING_RATE,
    NAME_LANGUAGE_TEXT,
    NOTE_PRESENCE_RATE,
    RAW_DOT_NOTE_RATE,
    SOURCE_COUNTS,
    STATUS_COUNTS,
    WORKING_CARDINALITIES,
    WORKING_MISSING_RATES,
    probabilities,
)


@dataclass(frozen=True)
class SyntheticCRMData:
    """Synthetic counterparts of the historical lead and lead-note exports."""

    leads: pd.DataFrame
    lead_notes: pd.DataFrame


def _zipf_weights(size: int, alpha: float) -> np.ndarray:
    ranks = np.arange(1, size + 1, dtype=float)
    weights = ranks ** (-alpha)
    return weights / weights.sum()


def _pool(prefix: str, size: int, width: int = 4) -> list[str]:
    return [f"Synthetic {prefix} {i:0{width}d}" for i in range(1, size + 1)]


def _apply_missing(
    frame: pd.DataFrame,
    column: str,
    rate: float,
    rng: np.random.Generator,
) -> None:
    frame.loc[rng.random(len(frame)) < rate, column] = pd.NA


def _format_date(date: pd.Timestamp, rng: np.random.Generator) -> str:
    # Both ISO and M/D/YYYY are visible in the public Start_Date output.
    return (
        date.strftime("%Y-%m-%d")
        if rng.random() < 0.65
        else f"{date.month}/{date.day}/{date.year}"
    )


def _sample_start_dates(n: int, rng: np.random.Generator) -> list[pd.Timestamp]:
    start = pd.Timestamp("2017-07-22")
    end = pd.Timestamp("2023-10-11")
    span = (end - start).days

    # Public value_counts() shows strong batch-day spikes. The listed counts are
    # observed; the remainder is spread over the observed range because the full
    # date histogram is not public.
    spikes = np.array(
        [
            np.datetime64("2020-08-27"),
            np.datetime64("2023-05-23"),
            np.datetime64("2021-05-20"),
            np.datetime64("2020-12-15"),
        ]
    )
    spike_counts = np.array([4487, 887, 799, 781], dtype=float)
    spike_prob = spike_counts / HISTORICAL_JOINED_LEADS
    result: list[pd.Timestamp] = []

    for _ in range(n):
        draw = rng.random()
        if draw < spike_prob.sum():
            result.append(pd.Timestamp(rng.choice(spikes, p=spike_prob / spike_prob.sum())))
        else:
            result.append(start + pd.Timedelta(days=int(rng.integers(0, span + 1))))
    return result


def _language_codes(n: int, rng: np.random.Generator) -> np.ndarray:
    labels, probs = probabilities(NAME_LANGUAGE_COUNTS)
    labels = np.array([*labels, None], dtype=object)
    probs = np.array([*(np.asarray(probs) * (1 - NAME_LANGUAGE_MISSING_RATE)), NAME_LANGUAGE_MISSING_RATE])
    return rng.choice(labels, size=n, p=probs)


def _sample_job_titles(n: int, rng: np.random.Generator) -> np.ndarray:
    """Preserve observed top-title skew plus a large synthetic long tail."""

    top_labels = list(JOB_TITLE_TOP_COUNTS)
    top_counts = np.array(list(JOB_TITLE_TOP_COUNTS.values()), dtype=float)
    working_non_null = HISTORICAL_JOINED_LEADS * (
        1 - WORKING_MISSING_RATES["Contact_Information_Job_Title"]
    )
    residual = max(float(working_non_null - top_counts.sum()), 1.0)

    tail_size = JOB_TITLE_CARDINALITY - len(top_labels)
    tail = _pool("Job Title", tail_size, width=5)
    labels = np.array([*top_labels, *tail], dtype=object)
    counts = np.concatenate([top_counts, np.full(tail_size, residual / tail_size)])
    return rng.choice(labels, size=n, p=counts / counts.sum())


def _generic_note(language: str, rng: np.random.Generator) -> str:
    templates: dict[str, tuple[str, ...]] = {
        "EN": (
            "Synthetic customer requested technical product information.",
            "Synthetic inquiry requested pricing and availability details.",
            "Synthetic sales follow-up recorded an application question.",
            "Synthetic customer asked for an engineering follow-up.",
            "Synthetic event attendee was queued for sales follow-up.",
        ),
        "DE": (
            "Synthetischer Kunde bat um technische Produktinformationen.",
            "Synthetische Anfrage bat um eine technische Rueckmeldung.",
        ),
        "ZH": ("Synthetic customer requested product technical information.", "Synthetic customer requested an engineering follow-up."),
        "ZF": ("Synthetic customer requested product technical information.",),
        "JA": ("Synthetic customer asked about product technical information.",),
        "KO": ("Synthetic customer asked about product technical information.",),
        "ES": ("El cliente sintetico solicito informacion tecnica del producto.",),
        "FR": ("Le client synthetique a demande des informations techniques.",),
    }
    options = templates.get(language, templates["EN"])
    return str(rng.choice(options))


def generate_synthetic_crm(
    n_leads: int = 500,
    seed: int = 42,
    *,
    missing_rate: float | None = None,
    max_notes_per_lead: int = 8,
) -> SyntheticCRMData:
    """Generate synthetic leads and notes calibrated to public aggregates.

    ``missing_rate=None`` uses field-specific observed rates where available.
    A numeric override exists only for deterministic edge-case testing.

    No historical record, identifier, person/account name, or free-text note is
    sampled, masked, translated, or copied by this generator.
    """

    if n_leads < 20:
        raise ValueError("n_leads must be at least 20")
    if missing_rate is not None and not 0.0 <= missing_rate < 0.95:
        raise ValueError("missing_rate must be in [0.0, 0.95) when provided")
    if not 1 <= max_notes_per_lead <= 20:
        raise ValueError("max_notes_per_lead must be between 1 and 20")

    rng = np.random.default_rng(seed)
    ids = [f"SYNTH-LEAD-{i:06d}" for i in range(1, n_leads + 1)]

    status_labels, status_probs = probabilities(STATUS_COUNTS)
    source_labels, source_probs = probabilities(SOURCE_COUNTS)
    statuses = rng.choice(status_labels, size=n_leads, p=status_probs)
    sources = rng.choice(source_labels, size=n_leads, p=source_probs)
    languages = _language_codes(n_leads, rng)
    job_titles = _sample_job_titles(n_leads, rng)
    starts = _sample_start_dates(n_leads, rng)

    # 30-day windows are frequent in visible rows; a variable tail prevents the
    # synthetic table from becoming artificially uniform. This mixture remains
    # explicitly approximate because the complete duration histogram is absent.
    durations = np.where(rng.random(n_leads) < 0.72, 30, rng.integers(1, 121, n_leads))
    ends = [d + pd.Timedelta(days=int(n)) for d, n in zip(starts, durations, strict=True)]

    owner_pool = _pool("Owner", WORKING_CARDINALITIES["Owner_Party_Name"])
    unit_pool = _pool("Sales Unit", WORKING_CARDINALITIES["Sales_Unit_Name"], 3)
    territory_pool = _pool("Territory", WORKING_CARDINALITIES["Sales_Territory_Name"], 3)
    topic_pool = _pool("Lead Topic", WORKING_CARDINALITIES["Name"], 5)

    common_names = np.array(
        [
            "Synthetic Web Request",
            "Synthetic Member Registration",
            "Synthetic Member Registration Upload",
            "Synthetic Web Request Variant",
            "Synthetic Electronic Catalog RFQ",
        ],
        dtype=object,
    )
    common_counts = np.array([28137, 6561, 4479, 1917, 1393], dtype=float)
    common_mass = common_counts.sum() / HISTORICAL_JOINED_LEADS
    names = [
        str(rng.choice(common_names, p=common_counts / common_counts.sum()))
        if rng.random() < common_mass
        else str(rng.choice(topic_pool))
        for _ in range(n_leads)
    ]

    has_note_rows = rng.random(n_leads) < NOTE_PRESENCE_RATE

    leads = pd.DataFrame(
        {
            "ObjectID": ids,
            "Lead_ID": np.arange(100_000, 100_000 + n_leads, dtype=int),
            "Name": names,
            "Name_Language_Code": languages,
            "Name_Language_Code_Text": [
                NAME_LANGUAGE_TEXT.get(str(v), pd.NA) if v is not None else pd.NA
                for v in languages
            ],
            "Account_Party_Name": [f"Synthetic Account {i:05d}" for i in rng.integers(1, max(500, n_leads // 2) + 1, n_leads)],
            "Main_Contact_Person_Name": [f"Synthetic Contact {i:05d}" for i in rng.integers(1, max(700, n_leads) + 1, n_leads)],
            "Company": rng.choice([True, False], size=n_leads, p=[0.93, 0.07]),
            "Contact_Information_Job_Title": job_titles,
            "Status_Text": statuses,
            "Reason_Code_Text": pd.Series([pd.NA] * n_leads, dtype="object"),
            "Source_Text": sources,
            "Priority_Text": rng.choice(["Normal", "High", "Low"], size=n_leads, p=[0.86, 0.10, 0.04]),
            "Start_Date": [_format_date(v, rng) for v in starts],
            "End_Date": [_format_date(v, rng) for v in ends],
            "Owner_Party_Name": rng.choice(owner_pool, n_leads, p=_zipf_weights(len(owner_pool), 1.1258)),
            "Marketing_Unit_Name": [pd.NA] * n_leads,
            "Sales_Unit_Name": rng.choice(unit_pool, n_leads, p=_zipf_weights(len(unit_pool), 0.8698)),
            "Sales_Territory_Name": rng.choice(territory_pool, n_leads, p=_zipf_weights(len(territory_pool), 0.8050)),
            "Note": [_generic_note(str(v) if v is not None else "EN", rng) for v in languages],
        },
        columns=LEAD_COLUMNS,
    )

    # Public rows show 9999-12-31 as an open-ended/sentinel End_Date. Its full
    # frequency is not published, so only a small clearly documented synthetic
    # subset receives the sentinel instead of pretending a calibrated rate.
    sentinel_candidates = (leads["Source_Text"] == "Web Member Registration") & (leads["Status_Text"] == "Closed")
    sentinel_mask = sentinel_candidates.to_numpy() & (rng.random(n_leads) < 0.08)
    leads.loc[sentinel_mask, "End_Date"] = "9999-12-31"

    reason_candidates = np.array(
        [
            "Synthetic no response",
            "Synthetic no potential",
            "Synthetic no further action",
            "Synthetic duplicate",
            "Synthetic automatically closed",
        ],
        dtype=object,
    )
    eligible_reason = leads["Status_Text"].isin(["Closed", "Sales Rejected"]).to_numpy()
    fill_reason = eligible_reason & (rng.random(n_leads) < 0.72)
    leads.loc[fill_reason, "Reason_Code_Text"] = rng.choice(reason_candidates, int(fill_reason.sum()))

    if missing_rate is None:
        leads.loc[~has_note_rows, "Note"] = pd.NA
        matched_note_missing = has_note_rows & (rng.random(n_leads) < WORKING_MISSING_RATES["Note"])
        leads.loc[matched_note_missing, "Note"] = pd.NA
        for column in ("Name", "Contact_Information_Job_Title", "Sales_Unit_Name", "Sales_Territory_Name"):
            _apply_missing(leads, column, WORKING_MISSING_RATES[column], rng)
    else:
        for column in ("Name", "Contact_Information_Job_Title", "Sales_Unit_Name", "Sales_Territory_Name", "Note"):
            _apply_missing(leads, column, missing_rate, rng)

    non_null_notes = leads["Note"].notna().to_numpy()
    dot_probability = min(
        RAW_DOT_NOTE_RATE / max(float(non_null_notes.mean()), np.finfo(float).eps),
        1.0,
    )
    dot_mask = non_null_notes & (rng.random(n_leads) < dot_probability)
    leads.loc[dot_mask, "Note"] = "."

    note_rows: list[dict[str, object]] = []
    sequence = 1
    for lead_id, present, start_date, end_date, language in zip(ids, has_note_rows, starts, ends, languages, strict=True):
        if not present:
            continue

        count = min(max_notes_per_lead, 1 + int(rng.poisson(EXTRA_NOTE_POISSON_LAMBDA)))
        duration = max(int((end_date - start_date).days), 1)
        offsets = np.sort(rng.integers(0, duration + 1, size=count))

        for offset in offsets:
            created = start_date + pd.Timedelta(days=int(offset), seconds=int(rng.integers(0, 86_400)))
            updated = created + pd.Timedelta(days=int(rng.integers(0, 30)))
            text: object = _generic_note(str(language) if language is not None else "EN", rng)
            if missing_rate is None and rng.random() < WORKING_MISSING_RATES["Text"]:
                text = pd.NA
            elif missing_rate is not None and rng.random() < missing_rate:
                text = pd.NA

            row = {
                "ObjectID": f"SYNTH-NOTE-{sequence:07d}",
                "ParentObjectID": lead_id,
                "HeaderObjectID": lead_id,
                "External_Key": pd.NA,
                "LeadExternalKey": pd.NA,
                "ID": sequence,
                "Text": text,
                "Language_Code": pd.NA,
                "Language_Code_Text": pd.NA,
                "Type_Code": 10001,
                "Type_Code_Text": "Additional External Comment",
                "Author_UUID": pd.NA,
                "Author_Name": pd.NA,
                "Created_On": created.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
                "Updated_On": updated.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
            }
            note_rows.append(row)
            sequence += 1

    notes = pd.DataFrame(note_rows, columns=LEAD_NOTE_COLUMNS)
    return SyntheticCRMData(leads=leads, lead_notes=notes)


def generate_synthetic_leads(
    n_rows: int = 500,
    seed: int = 42,
    *,
    missing_rate: float | None = None,
) -> pd.DataFrame:
    """Return only the synthetic raw-like lead table."""

    return generate_synthetic_crm(n_rows, seed, missing_rate=missing_rate).leads


def generate_synthetic_lead_notes(
    n_leads: int = 500,
    seed: int = 42,
    *,
    missing_rate: float | None = None,
) -> pd.DataFrame:
    """Return only the matching synthetic raw-like lead-note table."""

    return generate_synthetic_crm(n_leads, seed, missing_rate=missing_rate).lead_notes
