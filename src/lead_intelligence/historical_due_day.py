"""Reconstruct the historical `due_day` feature from recovered 2024 artifacts."""

from __future__ import annotations

from typing import Final

import pandas as pd

START_DATE_COLUMN: Final = "Start_Date"
END_DATE_COLUMN: Final = "End_Date"
HISTORICAL_DUE_DAY_COLUMN: Final = "due_day"
HISTORICAL_OPEN_END_DATES: Final[frozenset[str]] = frozenset(
    {"9999-12-31", "12/31/9999"}
)
HISTORICAL_OPEN_END_DUE_DAY: Final = 69


def _parse_historical_date(value: object, column: str) -> pd.Timestamp:
    """Parse one historical date value while preserving mixed source formats."""
    parsed = pd.to_datetime(value, errors="coerce")
    if pd.isna(parsed):
        raise ValueError(f"could not parse historical {column} value: {value!r}")
    return parsed


def reconstruct_historical_due_day(frame: pd.DataFrame) -> pd.DataFrame:
    """Add the recovered day-span feature without mutating the input frame."""
    required = (START_DATE_COLUMN, END_DATE_COLUMN)
    missing = [column for column in required if column not in frame.columns]
    if missing:
        raise ValueError(
            f"historical modeling table is missing required columns: {', '.join(missing)}"
        )

    due_days: list[int] = []
    for start_value, end_value in zip(
        frame[START_DATE_COLUMN], frame[END_DATE_COLUMN], strict=True
    ):
        if str(end_value).strip() in HISTORICAL_OPEN_END_DATES:
            due_days.append(HISTORICAL_OPEN_END_DUE_DAY)
            continue

        start_date = _parse_historical_date(start_value, START_DATE_COLUMN)
        end_date = _parse_historical_date(end_value, END_DATE_COLUMN)
        due_days.append((end_date - start_date).days)

    reconstructed = frame.copy()
    reconstructed[HISTORICAL_DUE_DAY_COLUMN] = pd.Series(
        due_days, index=reconstructed.index, dtype="int32"
    )
    return reconstructed
