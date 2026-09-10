"""Contract tests for the historical outreach draft API."""

import asyncio

from httpx import ASGITransport, AsyncClient

from lead_intelligence.api import app


def _post_outreach(payload: dict[str, object]):
    """Send one outreach draft request against the in-process ASGI app."""

    async def request_outreach():
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            return await client.post("/historical/outreach-draft", json=payload)

    return asyncio.run(request_outreach())


def _valid_payload() -> dict[str, object]:
    """Return one valid privacy-safe outreach request."""
    return {
        "lead_name": "Northstar Manufacturing",
        "source": "Industry event",
        "sales_unit": "Central Europe",
        "priority": "High",
        "predicted_label": 2,
    }


def test_historical_outreach_draft_returns_local_reviewable_message(
    monkeypatch,
) -> None:
    """Return the deterministic fallback draft when the provider is disabled."""
    monkeypatch.setenv("LLM_PROVIDER", "disabled")

    response = _post_outreach(_valid_payload())

    assert response.status_code == 200
    assert response.json() == {
        "draft": (
            "Hello Northstar Manufacturing,\n\n"
            "I'm reaching out from our Central Europe sales team regarding a lead "
            "recorded through Industry event. If a conversation would be useful, we'd "
            "be happy to arrange a follow-up at a convenient time.\n\n"
            "Best regards,\nSales team"
        )
    }


def test_historical_outreach_draft_rejects_blank_context() -> None:
    """Reject whitespace-only customer context before prompt construction."""
    payload = _valid_payload()
    payload["lead_name"] = "   "

    response = _post_outreach(payload)

    assert response.status_code == 422


def test_historical_outreach_draft_rejects_unsupported_label_type() -> None:
    """Reject boolean prediction labels instead of coercing them to integers."""
    payload = _valid_payload()
    payload["predicted_label"] = True

    response = _post_outreach(payload)

    assert response.status_code == 422


def test_historical_outreach_draft_reports_unconfigured_provider(
    monkeypatch,
) -> None:
    """Return service unavailable when an external provider is not configured."""
    monkeypatch.setenv("LLM_PROVIDER", "openai")

    response = _post_outreach(_valid_payload())

    assert response.status_code == 503
    assert response.json() == {
        "detail": "historical outreach provider is not configured"
    }
