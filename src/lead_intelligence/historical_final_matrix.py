"""Assemble the recovered 2024 final 18-feature modeling table."""

from __future__ import annotations

from collections.abc import Sequence

import pandas as pd

from lead_intelligence.historical_due_day import reconstruct_historical_due_day
from lead_intelligence.historical_features import select_final_modeling_columns
from lead_intelligence.historical_final_categorical import (
    reconstruct_historical_final_categorical_codes,
)
from lead_intelligence.historical_final_note_label import (
    HISTORICAL_FINAL_NOTE_LABEL_COLUMN,
    recode_historical_final_note_label,
)
from lead_intelligence.historical_marketing_unit import (
    infer_historical_marketing_unit_name_codes,
)
from lead_intelligence.historical_save_categorical import (
    reconstruct_historical_save_categorical_codes,
)
from lead_intelligence.historical_sealing_amount import (
    reconstruct_historical_sealing_amount_codes,
)
from lead_intelligence.historical_target import reconstruct_final_three_class_target


def assemble_historical_final_modeling_table(
    leads: pd.DataFrame,
    raw_note_scores: Sequence[int | None],
) -> pd.DataFrame:
    """Compose the recovered preprocessing stages into the final model table.

    ``raw_note_scores`` must be aligned one-for-one with the raw lead rows. The
    save-stage categorical codes are reconstructed before the final-status
    cohort filter because the recovered ``save.csv`` proves that ordering. The
    final-table categorical codes are reconstructed after cohort filtering,
    matching the recovered ``jiho_feature.csv`` output. Marketing-unit coding
    remains inferred, as documented by its dedicated reconstruction function.
    """
    if len(raw_note_scores) != len(leads):
        raise ValueError(
            "raw note scores must contain exactly one value for each raw lead row"
        )

    staged = reconstruct_historical_save_categorical_codes(leads)
    staged = infer_historical_marketing_unit_name_codes(staged)
    staged[HISTORICAL_FINAL_NOTE_LABEL_COLUMN] = pd.Series(
        [recode_historical_final_note_label(score) for score in raw_note_scores],
        index=staged.index,
        dtype="int64",
    )

    modeled = reconstruct_final_three_class_target(staged)
    modeled = reconstruct_historical_final_categorical_codes(modeled)
    modeled = reconstruct_historical_due_day(modeled)
    modeled = reconstruct_historical_sealing_amount_codes(modeled)

    return select_final_modeling_columns(modeled)
