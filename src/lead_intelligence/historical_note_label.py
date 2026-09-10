"""Reconstruct the 2024 GPT note-label input and raw score contract."""

from __future__ import annotations

from typing import Final

import pandas as pd

from lead_intelligence.data_schema import ID_COLUMN

NOTE_COLUMN: Final = "Note"
NOTE_PARENT_COLUMN: Final = "ParentObjectID"
NOTE_TEXT_COLUMN: Final = "Text"
HISTORICAL_COMBINED_NOTE_COLUMN: Final = "Combine Text"
HISTORICAL_NOTE_LABEL_MODEL: Final = "gpt-4"
HISTORICAL_NOTE_LABEL_PROMPT: Final = (
    "Classify the lead based on the information provided in the note as either "
    "High Good, Good, Neutral, Bad, or High Bad in terms of its likelihood to "
    "convert into an actual customer. If the lead appears highly likely to "
    "convert and shows strong potential, label it as High Good; if it seems "
    "likely to convert but with less certainty, label it as Good; if unsure, "
    "label it as Neutral; if it seems unlikely to convert, label it as Bad; if "
    "it shows strong indications of not converting, label it as High Bad.\n\n"
)
HISTORICAL_RAW_NOTE_LABEL_SCORES: Final[dict[str, int]] = {
    "High Good": 4,
    "Good": 3,
    "Neutral": 2,
    "Bad": 1,
    "High Bad": 0,
}
HISTORICAL_RAW_NOTE_LABEL_FALLBACK: Final = 2


def reconstruct_historical_note_label_inputs(
    leads: pd.DataFrame, notes: pd.DataFrame
) -> pd.DataFrame:
    """Build the exact lead-note text payload used before the historical GPT call."""
    lead_required = (ID_COLUMN, NOTE_COLUMN)
    note_required = (NOTE_PARENT_COLUMN, NOTE_TEXT_COLUMN)
    missing = [column for column in lead_required if column not in leads.columns]
    missing += [column for column in note_required if column not in notes.columns]
    if missing:
        raise ValueError(f"historical note labeling is missing required columns: {', '.join(missing)}")

    usable_notes = notes.dropna(subset=[NOTE_TEXT_COLUMN]).copy()
    usable_notes[NOTE_TEXT_COLUMN] = usable_notes[NOTE_TEXT_COLUMN].astype(str)
    grouped = usable_notes.groupby(NOTE_PARENT_COLUMN)[NOTE_TEXT_COLUMN].apply(list)

    reconstructed = leads.copy()
    reconstructed[NOTE_COLUMN] = reconstructed[NOTE_COLUMN].fillna("")
    related = reconstructed[ID_COLUMN].map(grouped)
    related = related.apply(lambda value: value if isinstance(value, list) else [])
    reconstructed[HISTORICAL_COMBINED_NOTE_COLUMN] = [
        note + "\n\n" + "\n\n".join(texts)
        for note, texts in zip(reconstructed[NOTE_COLUMN], related, strict=True)
    ]
    return reconstructed


def build_historical_note_label_message(combined_text: str) -> str:
    """Prepend the recovered 2024 classification prompt to one combined note."""
    return HISTORICAL_NOTE_LABEL_PROMPT + combined_text


def map_historical_note_label_response(response: str) -> int:
    """Map the exact GPT label text to the raw 0-4 score used by the notebook."""
    return HISTORICAL_RAW_NOTE_LABEL_SCORES.get(
        response, HISTORICAL_RAW_NOTE_LABEL_FALLBACK
    )
