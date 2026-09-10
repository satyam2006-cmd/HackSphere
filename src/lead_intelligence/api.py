"""FastAPI entry point for the reconstruction."""

from __future__ import annotations

import os

import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from xgboost import XGBClassifier

from lead_intelligence.conversion_pipeline import (
    ALL_FEATURE_COLS,
    clean_and_process_injected_dataset,
    get_conversion_pipeline,
    get_demo_20_pipeline,
    get_lock_strategy,
    get_pipeline_metrics,
    get_raw_sample_injection_leads,
    load_scored_leads_from_csv,
    score_lead,
)
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
    ConversionBatchPredictRequest,
    ConversionBatchPredictResponse,
    ConversionPipelineMetricsResponse,
    ConversionPredictRequest,
    ConversionPredictResponse,
    HealthResponse,
    HistoricalModelMetricsResponse,
    HistoricalOutreachDraftRequest,
    HistoricalOutreachDraftResponse,
    HistoricalPredictionRequest,
    HistoricalPredictionResponse,
    InjectedDatasetRequest,
    InjectedPipelineResponse,
    LeadItem,
    LeadListResponse,
    PipelineDemoResponse,
    ScoredLeadItem,
    ScoredLeadListResponse,
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


# ── Conversion pipeline endpoints (from LeadintelligenceXgboost.ipynb) ───────



@app.post(
    "/conversion/predict",
    response_model=ConversionPredictResponse,
    tags=["conversion"],
)
def conversion_predict(request: ConversionPredictRequest) -> ConversionPredictResponse:
    """Score a single lead using the binary conversion XGBoost pipeline."""
    try:
        result = score_lead(request.features)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Conversion prediction failed: {exc}",
        ) from exc

    return ConversionPredictResponse(
        lead_id=request.lead_id,
        **result,
    )


@app.post(
    "/conversion/predict-batch",
    response_model=ConversionBatchPredictResponse,
    tags=["conversion"],
)
def conversion_predict_batch(
    request: ConversionBatchPredictRequest,
) -> ConversionBatchPredictResponse:
    """Score multiple leads at once using the binary conversion pipeline."""
    results = []
    for i, lead_features in enumerate(request.leads):
        lead_id = str(lead_features.pop("Lead_ID", lead_features.pop("lead_id", f"lead-{i}")))
        try:
            result = score_lead(lead_features)
            results.append(ConversionPredictResponse(lead_id=lead_id, **result))
        except Exception:
            results.append(ConversionPredictResponse(
                lead_id=lead_id,
                predicted_probability=0.0,
                predicted_converted=0,
                lead_score=0,
                lead_category="Cold",
                lock_chance_pct=0.0,
                confidence_level="Low",
                primary_driver="Error in prediction",
                positive_evidence=[],
                negative_evidence=[],
                lock_strategy="N/A",
            ))

    return ConversionBatchPredictResponse(results=results, total=len(results))


@app.get(
    "/conversion/demo-pipeline-20",
    response_model=PipelineDemoResponse,
    tags=["conversion"],
)
def get_demo_pipeline_20_endpoint() -> PipelineDemoResponse:
    """Return the curated 20-lead pipeline verification dataset demonstrating all 3 classes (Hot, Warm, Cold)."""
    data = get_demo_20_pipeline(run_live=False)
    return PipelineDemoResponse(**data)


@app.post(
    "/conversion/demo-pipeline-20/run",
    response_model=PipelineDemoResponse,
    tags=["conversion"],
)
def run_demo_pipeline_20_endpoint() -> PipelineDemoResponse:
    """Execute the full XGBoost pipeline live across the 20 verification leads with benchmark timing."""
    data = get_demo_20_pipeline(run_live=True)
    return PipelineDemoResponse(**data)


@app.post(
    "/conversion/inject-pipeline",
    response_model=InjectedPipelineResponse,
    tags=["conversion"],
)
def inject_custom_dataset(request: InjectedDatasetRequest) -> InjectedPipelineResponse:
    """Ingest, clean, impute, and score an arbitrary raw dataset from the frontend."""
    import csv
    import io

    leads_to_process: list[dict[str, object]] = []

    if request.csv_text and request.csv_text.strip():
        try:
            reader = csv.DictReader(io.StringIO(request.csv_text.strip()))
            leads_to_process = [dict(row) for row in reader]
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to parse CSV dataset: {exc}",
            ) from exc
    elif request.leads:
        leads_to_process = [dict(lead) for lead in request.leads]
    else:
        # Fallback to the raw sample leads
        sample = get_raw_sample_injection_leads()
        leads_to_process = [dict(lead) for lead in sample]

    try:
        result = clean_and_process_injected_dataset(leads_to_process)
        return InjectedPipelineResponse(**result)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Injected pipeline processing failed: {exc}",
        ) from exc


@app.get(
    "/conversion/sample-injection-dataset",
    tags=["conversion"],
)
def get_sample_injection_dataset_endpoint() -> list[dict[str, object]]:
    """Return the raw 25-lead sample dataset for frontend injection testing."""
    return get_raw_sample_injection_leads()


@app.get(
    "/conversion/scored-leads",
    response_model=ScoredLeadListResponse,
    tags=["conversion"],
)
def get_scored_leads(
    category: str | None = None,
    sort_by: str = "lead_score",
    order: str = "desc",
    limit: int = 100,
    offset: int = 0,
) -> ScoredLeadListResponse:
    """Return pre-scored leads from final_lead_intelligence.csv with filtering and evidence."""
    import math

    def _safe_float(val: object, default: float = 0.0) -> float:
        try:
            f = float(val)  # type: ignore[arg-type]
            return default if (math.isnan(f) or math.isinf(f)) else f
        except (ValueError, TypeError):
            return default

    def _safe_str(val: object, default: str = "") -> str:
        s = str(val) if val is not None else default
        return default if s == "nan" else s

    df = load_scored_leads_from_csv()
    if df.empty:
        return ScoredLeadListResponse(leads=[], total=0, category_counts={})

    # Overall dataset category counts
    total_all = len(df)
    cat_series = df["Lead_Category"].astype(str).str.strip()
    category_counts = {
        "all": total_all,
        "hot": int((cat_series == "Hot").sum()),
        "warm": int((cat_series == "Warm").sum()),
        "cold": int((cat_series == "Cold").sum()),
    }

    if category and category.lower() != "all":
        df = df[df["Lead_Category"].str.lower() == category.lower()]

    reverse = order.lower() == "desc"
    if sort_by in df.columns:
        df = df.sort_values(sort_by, ascending=not reverse)
    elif sort_by == "lead_score":
        df = df.sort_values("Lead_Score", ascending=not reverse)

    total = len(df)
    df_slice = df.iloc[offset:offset + limit]

    items: list[ScoredLeadItem] = []
    for _, row in df_slice.iterrows():
        score_val = int(row.get("Lead_Score", 0))
        cat_val = _safe_str(row.get("Lead_Category"), "Cold")
        proba_val = _safe_float(row.get("Predicted_Probability"))
        lock_pct = round(proba_val * 100, 1)

        conf_level = (
            "Very High" if score_val >= 90
            else "High" if score_val >= 60
            else "Moderate" if score_val >= 40
            else "Low"
        )
        strat = get_lock_strategy(cat_val, score_val)

        # Generate lightweight signals for evidence
        pos_ev: list[str] = []
        neg_ev: list[str] = []
        time_spent = _safe_float(row.get("Total Time Spent on Website"))
        if time_spent > 800:
            pos_ev.append(f"High Site Engagement: {int(time_spent)}s on site")
        elif time_spent < 100:
            neg_ev.append(f"Low Website Activity: {int(time_spent)}s on site")

        origin = _safe_str(row.get("Lead Origin"))
        if origin in ("Lead Add Form", "Reference"):
            pos_ev.append(f"High-Intent Origin: {origin}")

        tag = _safe_str(row.get("Tags"))
        if tag and tag not in ("nan", ""):
            if any(w in tag.lower() for w in ("revert", "closed", "high", "interested")):
                pos_ev.append(f"Positive Tag: {tag}")
            elif any(w in tag.lower() for w in ("ringing", "student", "lost", "switched", "busy")):
                neg_ev.append(f"Friction Tag: {tag}")

        primary = pos_ev[0] if pos_ev else (neg_ev[0] if neg_ev else f"Category baseline: {cat_val}")

        items.append(ScoredLeadItem(
            sales_rank=int(row.get("Sales_Rank", 0)),
            lead_id=str(row.get("Lead_ID", "")),
            lead_score=score_val,
            lead_category=cat_val,
            lock_chance_pct=lock_pct,
            confidence_level=conf_level,
            primary_driver=primary,
            positive_evidence=pos_ev,
            negative_evidence=neg_ev,
            lock_strategy=strat,
            predicted_probability=proba_val,
            predicted_converted=int(row.get("Predicted_Converted", 0)),
            actual_converted=int(row.get("Actual_Converted", 0)),
            lead_origin=origin,
            lead_source=_safe_str(row.get("Lead Source")),
            last_activity=_safe_str(row.get("Last Activity")),
            country=_safe_str(row.get("Country")),
            specialization=_safe_str(row.get("Specialization")),
            occupation=_safe_str(row.get("What is your current occupation")),
            city=_safe_str(row.get("City")),
            tags=tag,
            lead_quality=_safe_str(row.get("Lead Quality")),
            total_visits=_safe_float(row.get("TotalVisits")),
            total_time_on_website=time_spent,
            page_views_per_visit=_safe_float(row.get("Page Views Per Visit")),
        ))

    return ScoredLeadListResponse(leads=items, total=total, category_counts=category_counts)


@app.get(
    "/conversion/metrics",
    response_model=ConversionPipelineMetricsResponse,
    tags=["conversion"],
)
def conversion_metrics() -> ConversionPipelineMetricsResponse:
    """Return full pipeline metrics from the notebook model metadata."""
    metrics = get_pipeline_metrics()
    return ConversionPipelineMetricsResponse(**metrics)


@app.get(
    "/conversion/pipeline-status",
    tags=["conversion"],
)
def conversion_pipeline_status() -> dict[str, object]:
    """Check whether the conversion pipeline is loaded and ready."""
    try:
        _ = get_conversion_pipeline()
        metrics = get_pipeline_metrics()
        return {
            "status": "ready",
            "model_name": metrics.get("model_name", ""),
            "version": metrics.get("version", ""),
            "roc_auc": metrics.get("roc_auc_score", 0.0),
            "f1_score": metrics.get("f1_score", 0.0),
            "feature_count": len(ALL_FEATURE_COLS),
        }
    except Exception as exc:
        return {
            "status": "unavailable",
            "error": str(exc),
        }
