"""Contract tests for SMTP outreach dispatch."""

import asyncio

from httpx import ASGITransport, AsyncClient

from lead_intelligence import api


def test_send_email_returns_gateway_error_when_smtp_fails(monkeypatch) -> None:
    """Do not report a failed SMTP delivery as a successful HTTP response."""
    monkeypatch.setattr(
        api,
        "send_outreach_email",
        lambda **kwargs: {
            "status": "error",
            "recipient": "lead@example.com",
            "message_id": "",
            "details": "SMTP connection closed",
        },
    )

    async def send_request():
        transport = ASGITransport(app=api.app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            return await client.post(
                "/outreach/send-email",
                json={
                    "recipient_email": "lead@example.com",
                    "subject": "Test outreach",
                    "body": "Test message",
                    "force_simulate": False,
                },
            )

    response = asyncio.run(send_request())

    assert response.status_code == 502
    assert response.json() == {"detail": "SMTP connection closed"}