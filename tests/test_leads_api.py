"""Tests for the multi-lead endpoints."""

import asyncio

from httpx import ASGITransport, AsyncClient

from lead_intelligence.api import app


def _get(path: str):
    async def request():
        transport = ASGITransport(app=app, raise_app_exceptions=False)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            return await client.get(path)

    return asyncio.run(request())


def test_get_leads_list():
    """Verify that synthetic leads are returned with ranking and features."""
    response = _get("/historical/leads")
    assert response.status_code == 200
    data = response.json()
    assert "leads" in data
    assert data["total"] > 0
    first_lead = data["leads"][0]
    assert "object_id" in first_lead
    assert "name" in first_lead
    assert "features" in first_lead
    assert "conversion_probability" in first_lead
    assert len(first_lead["features"]) == 18


def test_get_lead_detail_found():
    """Verify single lead retrieval by ObjectID."""
    list_res = _get("/historical/leads")
    first_lead = list_res.json()["leads"][0]
    obj_id = first_lead["object_id"]

    detail_res = _get(f"/historical/leads/{obj_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["object_id"] == obj_id
    assert detail["name"] == first_lead["name"]


def test_get_lead_detail_not_found():
    """Verify 404 for unknown lead."""
    response = _get("/historical/leads/NONEXISTENT-ID")
    assert response.status_code == 404
