"""Aggregate profile used to calibrate the synthetic data generator.

Only aggregate counts and schema facts are stored here. No historical customer
records, identifiers, names, free-text notes, credentials, or model artifacts
are copied into this reconstruction.
"""

from __future__ import annotations

from typing import Final

HISTORICAL_RAW_LEADS: Final = 86_244
HISTORICAL_RAW_LEAD_COLUMNS: Final = 181
HISTORICAL_RAW_NOTES: Final = 134_793
HISTORICAL_RAW_NOTE_COLUMNS: Final = 16
HISTORICAL_JOINED_LEADS: Final = 78_759
HISTORICAL_AFTER_DOT_NOTE_DROP: Final = 84_851

# df.info() after dropping raw lead rows whose Note was exactly '.'.
RAW_LEAD_DTYPE_COUNTS: Final[dict[str, int]] = {
    "bool": 39,
    "float64": 25,
    "int64": 1,
    "object": 116,
}

# Pandas reported these zero-based lead-column positions as mixed-type on CSV
# load. We keep the positions as an observed dirtiness signal without inventing
# names for columns whose names are not publicly recovered.
RAW_MIXED_TYPE_COLUMN_INDICES: Final[tuple[int, ...]] = (
    2, 9, 11, 22, 23, 46, 47, 48, 49, 56, 59, 66, 105, 109, 114, 117,
    120, 126, 127, 128, 140, 141, 143, 144, 145, 158, 167, 168, 174,
    175, 176, 178, 180,
)

# The original Transformer notebook tripled Converted rows before displaying
# class counts. The Converted count below reverses that documented oversampling.
STATUS_COUNTS: Final[dict[str, int]] = {
    "Closed": 53_538,
    "Unqualified": 14_402,
    "Converted": 6_097,
    "Qualified": 3_789,
    "Sales Rejected": 933,
}

SOURCE_COUNTS: Final[dict[str, int]] = {
    "Website Contact Form": 34_328,
    "Web Member Registration": 13_604,
    "Sales": 6_227,
    "Webinar": 5_012,
    "Trade Show": 4_466,
    "Conference": 4_140,
    "Chat-bot": 2_043,
    "e-Catalog": 1_446,
    "Relationship newsletter": 1_320,
    "Sealing Solutions Configurator": 1_006,
    "Marketing Intelligence Analysis": 787,
    "TSS Landing Page": 593,
    "WeChat": 531,
    "Roadshow": 467,
    "Google Ads": 446,
    "Relevant Behavior Upon Campaigns": 384,
    "CAD Service": 377,
    "Trelleborg Mailboxes": 356,
    "LinkedIn": 287,
    "Variseal Selector": 227,
    "External e-blast": 120,
    "Event": 100,
    "Nurturing": 91,
    "Organic Search": 73,
    "Seminar": 70,
    "Seals-Shop Registration": 60,
    "Rotary Seal Selector": 49,
    "Scoring": 42,
    "Relevant Behavior on TSS Websites": 37,
    "Social Media": 27,
    "Specific e-mails": 18,
    "Facebook": 8,
    "6Sense": 4,
    "Twitter": 3,
    "Email Marketing": 3,
    "Sales Navigator": 3,
    "Seal Configurator Projects filed/updated": 2,
    "e-Catalog RFQ": 1,
    "Seal Configurator RFQ/RFA": 1,
}

# Top values explicitly visible in the public raw-lead value_counts output.
# The long tail contained 12,687 distinct job-title values in total, so the
# generator must not treat these five categories as the complete domain.
JOB_TITLE_TOP_COUNTS: Final[dict[str, int]] = {
    "Engineer": 27_901,
    "Purchasing": 12_337,
    "Student": 1_191,
    "CEO": 272,
    "Design Engineer": 254,
}
JOB_TITLE_CARDINALITY: Final = 12_687

# Missing counts after the public workflow inner-joined notes and selected the
# earliest Created_On row for each ObjectID (78,759-row working cohort).
WORKING_MISSING_COUNTS: Final[dict[str, int]] = {
    "Name": 161,
    "Contact_Information_Job_Title": 12_005,
    "Sales_Unit_Name": 48_663,
    "Sales_Territory_Name": 40_215,
    "Note": 1_400,
    "Text": 423,
}

WORKING_CARDINALITIES: Final[dict[str, int]] = {
    "Name": 11_768,
    "Start_Date": 3_083,
    "Owner_Party_Name": 1_108,
    "Sales_Unit_Name": 104,
    "Sales_Territory_Name": 397,
}

RAW_LEAD_NOTE_MISSING: Final = 8_885
RAW_LEAD_DOT_NOTE_COUNT: Final = 1_393

NAME_LANGUAGE_COUNTS: Final[dict[str, int]] = {
    "EN": 80_635,
    "ZH": 2_987,
    "DE": 1_107,
    "JA": 467,
    "ZF": 109,
    "ES": 62,
    "KO": 40,
    "SV": 28,
    "PL": 18,
    "PT": 16,
    "TR": 4,
    "FR": 4,
    "IT": 3,
    "DA": 1,
    "CS": 1,
    "HU": 1,
}

NAME_LANGUAGE_TEXT: Final[dict[str, str]] = {
    "EN": "English",
    "ZH": "Chinese",
    "DE": "German",
    "JA": "Japanese",
    "ZF": "Chinese trad.",
    "ES": "Spanish",
    "KO": "Korean",
    "SV": "Swedish",
    "PL": "Polish",
    "PT": "Portuguese",
    "TR": "Turkish",
    "FR": "French",
    "IT": "Italian",
    "DA": "Danish",
    "CS": "Czech",
    "HU": "Hungarian",
}


def probabilities(counts: dict[str, int]) -> tuple[tuple[str, ...], tuple[float, ...]]:
    """Convert integer aggregate counts to aligned labels and probabilities."""

    total = sum(counts.values())
    return tuple(counts), tuple(value / total for value in counts.values())


NOTE_PRESENCE_RATE: Final = HISTORICAL_JOINED_LEADS / HISTORICAL_RAW_LEADS
MEAN_NOTES_PER_MATCHED_LEAD: Final = HISTORICAL_RAW_NOTES / HISTORICAL_JOINED_LEADS
EXTRA_NOTE_POISSON_LAMBDA: Final = MEAN_NOTES_PER_MATCHED_LEAD - 1.0

WORKING_MISSING_RATES: Final[dict[str, float]] = {
    key: value / HISTORICAL_JOINED_LEADS for key, value in WORKING_MISSING_COUNTS.items()
}

RAW_DOT_NOTE_RATE: Final = RAW_LEAD_DOT_NOTE_COUNT / HISTORICAL_RAW_LEADS
NAME_LANGUAGE_MISSING_RATE: Final = (
    HISTORICAL_RAW_LEADS - sum(NAME_LANGUAGE_COUNTS.values())
) / HISTORICAL_RAW_LEADS
