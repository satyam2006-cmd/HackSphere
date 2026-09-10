import pandas as pd
import pytest

from lead_intelligence.historical_note_label import (
    HISTORICAL_COMBINED_NOTE_COLUMN,
    HISTORICAL_NOTE_LABEL_PROMPT,
    build_historical_note_label_message,
    map_historical_note_label_response,
    reconstruct_historical_note_label_inputs,
)

EXPECTED_HISTORICAL_NOTE_LABEL_PROMPT = (
    "Classify the lead based on the information provided in the note as either "
    "High Good, Good, Neutral, Bad, or High Bad in terms of its likelihood to "
    "convert into an actual customer. If the lead appears highly likely to "
    "convert and shows strong potential, label it as High Good; if it seems "
    "likely to convert but with less certainty, label it as Good; if unsure, "
    "label it as Neutral; if it seems unlikely to convert, label it as Bad; if "
    "it shows strong indications of not converting, label it as High Bad.\n\n"
)


def test_reconstructs_combined_note_text_in_historical_order() -> None:
    """Verify the lead note and every related note are combined in source order."""
    leads = pd.DataFrame(
        {
            "ObjectID": ["A", "B"],
            "Note": ["Lead note", None],
        }
    )
    notes = pd.DataFrame(
        {
            "ParentObjectID": ["A", "A", "B", "A"],
            "Text": ["First related", "Second related", None, "Third related"],
        }
    )
    original_leads = leads.copy(deep=True)
    original_notes = notes.copy(deep=True)

    reconstructed = reconstruct_historical_note_label_inputs(leads, notes)

    assert reconstructed[HISTORICAL_COMBINED_NOTE_COLUMN].tolist() == [
        "Lead note\n\nFirst related\n\nSecond related\n\nThird related",
        "\n\n",
    ]
    assert HISTORICAL_COMBINED_NOTE_COLUMN not in leads.columns
    assert notes["Text"].tolist() == ["First related", "Second related", None, "Third related"]
    pd.testing.assert_frame_equal(leads, original_leads)
    pd.testing.assert_frame_equal(notes, original_notes)


def test_builds_exact_historical_prompt_prefix() -> None:
    """Verify the recovered GPT prompt is prepended without rewriting the note text."""
    combined = "Example lead note\n\nRelated note"

    assert HISTORICAL_NOTE_LABEL_PROMPT == EXPECTED_HISTORICAL_NOTE_LABEL_PROMPT
    assert build_historical_note_label_message(combined) == (
        EXPECTED_HISTORICAL_NOTE_LABEL_PROMPT + combined
    )


@pytest.mark.parametrize(
    ("response", "expected"),
    [
        ("High Good", 4),
        ("Good", 3),
        ("Neutral", 2),
        ("Bad", 1),
        ("High Bad", 0),
        ("Good\n", 2),
        ("unexpected answer", 2),
    ],
)
def test_maps_historical_gpt_response_to_raw_score(response: str, expected: int) -> None:
    """Preserve exact-match scoring and the notebook's neutral fallback."""
    assert map_historical_note_label_response(response) == expected


def test_requires_lead_and_note_join_columns() -> None:
    """Verify reconstruction fails rather than inventing missing join inputs."""
    with pytest.raises(ValueError, match="ParentObjectID"):
        reconstruct_historical_note_label_inputs(
            pd.DataFrame({"ObjectID": ["A"], "Note": ["note"]}),
            pd.DataFrame({"Text": ["related"]}),
        )
