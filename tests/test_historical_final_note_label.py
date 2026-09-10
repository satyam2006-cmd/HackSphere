import pytest

from lead_intelligence.historical_final_note_label import (
    HISTORICAL_FINAL_NOTE_LABEL_PLACEHOLDER,
    recode_historical_final_note_label,
)


@pytest.mark.parametrize(
    ("raw_score", "expected_final"),
    [
        (3, 0),
        (0, 1),
        (4, 2),
        (2, 3),
        (1, 4),
    ],
)
def test_recodes_recovered_raw_scores_to_final_note_label(
    raw_score: int, expected_final: int
) -> None:
    """Preserve the exact raw-to-final mapping observed in recovered artifacts."""
    assert recode_historical_final_note_label(raw_score) == expected_final


def test_marks_scores_not_incorporated_into_final_snapshot_with_five() -> None:
    """Preserve the final snapshot placeholder without treating it as a GPT score."""
    assert HISTORICAL_FINAL_NOTE_LABEL_PLACEHOLDER == 5
    assert recode_historical_final_note_label(None) == 5


@pytest.mark.parametrize("unsupported", [-1, 5, 6, True, 1.0, []])
def test_rejects_values_outside_the_historical_raw_score_contract(
    unsupported: object,
) -> None:
    """Reject values that were not part of the recovered GPT raw 0-4 contract."""
    with pytest.raises(ValueError, match="0, 1, 2, 3, 4 or None"):
        recode_historical_final_note_label(unsupported)  # type: ignore[arg-type]
