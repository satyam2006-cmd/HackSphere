"""Smoke tests for the API process."""

import asyncio

from httpx import ASGITransport, AsyncClient

from lead_intelligence.api import app


def test_health_returns_versioned_ok_response() -> None:
    async def request_health():
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            return await client.get("/health")

    response = asyncio.run(request_health())

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "0.1.0"}
