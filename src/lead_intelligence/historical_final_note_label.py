"""Reconstruct the final 2024 `Note_Label` storage encoding."""

from __future__ import annotations

from typing import Final

HISTORICAL_FINAL_NOTE_LABEL_COLUMN: Final = "Note_Label"
HISTORICAL_FINAL_NOTE_LABEL_PLACEHOLDER: Final = 5

# Cross-checking the surviving raw GPT score chunks against `jiho_feature.csv`
# shows this exact mapping for every score that was incorporated into the final
# modeling snapshot. The precise original encoding function is not available.
HISTORICAL_RAW_TO_FINAL_NOTE_LABEL: Final[dict[int, int]] = {
    3: 0,
    0: 1,
    4: 2,
    2: 3,
    1: 4,
}


def recode_historical_final_note_label(raw_score: int | None) -> int:
    """Map one recovered raw GPT score to the final `jiho_feature` encoding.

    `None` is the reconstruction-side marker for a raw score that was not
    incorporated into the recovered final modeling snapshot. Those rows are
    stored as `5` in `jiho_feature.csv`; `5` is not treated as a GPT raw score.
    """
    if raw_score is None:
        return HISTORICAL_FINAL_NOTE_LABEL_PLACEHOLDER

    if (
        isinstance(raw_score, bool)
        or not isinstance(raw_score, int)
        or raw_score not in HISTORICAL_RAW_TO_FINAL_NOTE_LABEL
    ):
        raise ValueError(
            "historical raw note score must be one of 0, 1, 2, 3, 4 or None"
        )

    return HISTORICAL_RAW_TO_FINAL_NOTE_LABEL[raw_score]
