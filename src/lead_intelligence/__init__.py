"""AI lead conversion platform."""

from __future__ import annotations

from lead_intelligence.api import app
from lead_intelligence.conversion_pipeline import (
    clean_and_process_injected_dataset,
    get_conversion_pipeline,
    get_demo_20_pipeline,
    get_pipeline_metrics,
    score_lead,
)
from lead_intelligence.schemas import (
    CleaningReport,
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
    PipelineDemoSummary,
    ScoredLeadItem,
    ScoredLeadListResponse,
)

__version__ = "0.1.0"

__all__ = [
    "CleaningReport",
    "ConversionBatchPredictRequest",
    "ConversionBatchPredictResponse",
    "ConversionPipelineMetricsResponse",
    "ConversionPredictRequest",
    "ConversionPredictResponse",
    "HealthResponse",
    "HistoricalModelMetricsResponse",
    "HistoricalOutreachDraftRequest",
    "HistoricalOutreachDraftResponse",
    "HistoricalPredictionRequest",
    "HistoricalPredictionResponse",
    "InjectedDatasetRequest",
    "InjectedPipelineResponse",
    "LeadItem",
    "LeadListResponse",
    "PipelineDemoResponse",
    "PipelineDemoSummary",
    "ScoredLeadItem",
    "ScoredLeadListResponse",
    "__version__",
    "app",
    "clean_and_process_injected_dataset",
    "get_conversion_pipeline",
    "get_demo_20_pipeline",
    "get_pipeline_metrics",
    "score_lead",
]
