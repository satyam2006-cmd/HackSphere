"""LLM adapter boundary for reconstructed historical outreach drafting."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Final, Protocol

LEAD_CONTEXT_START: Final = "<lead_context>\n"
LEAD_CONTEXT_END: Final = "\n</lead_context>"


class HistoricalOutreachDraftAdapter(Protocol):
    """Generate one customer-facing draft from a prepared historical prompt."""

    def draft(self, prompt: str) -> str:
        """Return one outreach draft for human review."""


@dataclass(frozen=True)
class DeterministicHistoricalOutreachAdapter:
    """Generate a reproducible local draft without calling an external model."""

    def draft(self, prompt: str) -> str:
        """Return a deterministic draft from the serialized lead context."""
        context = _extract_lead_context(prompt)
        lead_name = _require_context_text(context, "lead_name")
        source = _require_context_text(context, "source")
        sales_unit = _require_context_text(context, "sales_unit")

        return (
            f"Hello {lead_name},\n\n"
            f"I'm reaching out from our {sales_unit} sales team regarding a lead "
            f"recorded through {source}. If a conversation would be useful, we'd be "
            "happy to arrange a follow-up at a convenient time.\n\n"
            "Best regards,\nSales team"
        )


def create_historical_outreach_adapter(
    provider: str,
) -> HistoricalOutreachDraftAdapter:
    """Select the configured historical outreach drafting adapter."""
    normalized_provider = provider.strip().lower()
    if normalized_provider in {"disabled", "local"}:
        return DeterministicHistoricalOutreachAdapter()

    raise ValueError(
        "unsupported historical LLM provider; use 'disabled' or 'local' "
        "until an external provider adapter is configured"
    )


def _extract_lead_context(prompt: str) -> dict[str, object]:
    """Parse the trusted delimited JSON context from a prepared outreach prompt."""
    if prompt.count(LEAD_CONTEXT_START) != 1 or prompt.count(LEAD_CONTEXT_END) != 1:
        raise ValueError("historical outreach prompt must contain one lead context block")

    payload = prompt.split(LEAD_CONTEXT_START, 1)[1].split(LEAD_CONTEXT_END, 1)[0]
    parsed = json.loads(payload)
    if not isinstance(parsed, dict):
        raise ValueError("historical outreach lead context must be a JSON object")
    return parsed


def _require_context_text(context: dict[str, object], field: str) -> str:
    """Return one non-empty text field from the serialized lead context."""
    value = context.get(field)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"historical outreach lead context requires text field: {field}")
    return value.strip()
