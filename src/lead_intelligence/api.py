"""FastAPI entry point for the reconstruction."""

import os

import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from xgboost import XGBClassifier

from lead_intelligence.historical_features import HISTORICAL_FINAL_FEATURE_COLUMNS
from lead_intelligence.historical_llm import create_historical_outreach_adapter
from lead_intelligence.historical_outreach import build_historical_outreach_prompt
from lead_intelligence.historical_xgboost import predict_historical_xgboost_labels
from lead_intelligence.lead_store import (
    get_default_model,
    get_lead_by_id,
    get_model_metrics,
    load_synthetic_leads,
)
from lead_intelligence.schemas import (
    HealthResponse,
    HistoricalOutreachDraftRequest,
    HistoricalOutreachDraftResponse,
    HistoricalModelMetricsResponse,
    HistoricalPredictionRequest,
    HistoricalPredictionResponse,
    LeadItem,
    LeadListResponse,
)

app = FastAPI(
    title="HackSphere",
    summary="Privacy-safe lead scoring and outreach drafting",
    version="0.1.0",
)

# Pre-load default trained baseline model
app.state.historical_xgboost_model = get_default_model()


@app.exception_handler(RequestValidationError)
async def validation_error_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """Return stable validation details without serializing unsafe raw inputs."""

    del request
    detail = [
        {
            "type": error["type"],
            "loc": error["loc"],
            "msg": error["msg"],
        }
        for error in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": detail})


@app.get("/", tags=["system"])
def root() -> dict[str, str]:
    """Provide a useful response when the API root is opened in a browser."""

    return {
        "name": app.title,
        "health": "/health",
        "docs": "/docs",
    }


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    """Report whether the API process is ready to accept requests."""

    return HealthResponse(status="ok", version=app.version)


@app.get(
    "/historical/model-metrics",
    response_model=HistoricalModelMetricsResponse,
    tags=["prediction"],
)
def historical_model_metrics() -> HistoricalModelMetricsResponse:
    """Return the loaded model's matrix and training accuracy for review."""
    return HistoricalModelMetricsResponse(**get_model_metrics())


@app.post(
    "/historical/predict",
    response_model=HistoricalPredictionResponse,
    tags=["prediction"],
)
def historical_predict(
    request: HistoricalPredictionRequest,
) -> HistoricalPredictionResponse:
    """Return one historical XGBoost class prediction from recovered features."""
    model = getattr(app.state, "historical_xgboost_model", None)
    if not isinstance(model, XGBClassifier):
        raise HTTPException(
            status_code=503,
            detail="historical XGBoost model is not loaded",
        )

    features = pd.DataFrame(
        [[request.features[column] for column in HISTORICAL_FINAL_FEATURE_COLUMNS]],
        columns=HISTORICAL_FINAL_FEATURE_COLUMNS,
    )
    prediction = predict_historical_xgboost_labels(model, features)
    return HistoricalPredictionResponse(predicted_label=int(prediction.iloc[0]))


@app.post(
    "/historical/outreach-draft",
    response_model=HistoricalOutreachDraftResponse,
    tags=["outreach"],
)
def historical_outreach_draft(
    request: HistoricalOutreachDraftRequest,
) -> HistoricalOutreachDraftResponse:
    """Return one reviewable outreach draft from reconstructed lead context."""
    prompt = build_historical_outreach_prompt(
        lead_name=request.lead_name,
        source=request.source,
        sales_unit=request.sales_unit,
        priority=request.priority,
        predicted_label=request.predicted_label,
    )

    provider = os.getenv("LLM_PROVIDER", "disabled")
    try:
        adapter = create_historical_outreach_adapter(provider)
    except ValueError as exc:
        raise HTTPException(
            status_code=503,
            detail="historical outreach provider is not configured",
        ) from exc

    return HistoricalOutreachDraftResponse(draft=adapter.draft(prompt))


@app.get(
    "/historical/leads",
    response_model=LeadListResponse,
    tags=["leads"],
)
def get_leads(
    query: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    sort_by: str = "conversion_probability",
    order: str = "desc",
) -> LeadListResponse:
    """Return synthetic CRM leads with search, filtering, and conversion likelihood ranking."""
    leads = load_synthetic_leads()

    if query:
        q = query.lower()
        leads = [
            lead
            for lead in leads
            if q in lead.name.lower()
            or q in lead.account_name.lower()
            or q in lead.contact_name.lower()
            or q in lead.source.lower()
            or q in lead.sales_unit.lower()
        ]

    if status and status.lower() != "all":
        leads = [lead for lead in leads if lead.status.lower() == status.lower()]

    if priority and priority.lower() != "all":
        leads = [lead for lead in leads if lead.priority.lower() == priority.lower()]

    # Sorting
    reverse = order.lower() == "desc"
    if sort_by == "conversion_probability":
        leads = sorted(leads, key=lambda l: l.conversion_probability, reverse=reverse)
    elif sort_by == "name":
        leads = sorted(leads, key=lambda l: l.name.lower(), reverse=reverse)
    elif sort_by == "priority":
        priority_order = {"high": 3, "normal": 2, "low": 1}
        leads = sorted(
            leads,
            key=lambda l: priority_order.get(l.priority.lower(), 0),
            reverse=reverse,
        )
    elif sort_by == "status":
        leads = sorted(leads, key=lambda l: l.status.lower(), reverse=reverse)

    return LeadListResponse(leads=leads, total=len(leads))


@app.get(
    "/historical/leads/{object_id}",
    response_model=LeadItem,
    tags=["leads"],
)
def get_lead(object_id: str) -> LeadItem:
    """Return a single synthetic CRM lead by ObjectID or Lead_ID."""
    lead = get_lead_by_id(object_id)
    if lead is None:
        raise HTTPException(
            status_code=404,
            detail=f"lead '{object_id}' not found",
        )
    return lead
