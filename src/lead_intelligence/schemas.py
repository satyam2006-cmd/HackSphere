"""API schemas shared by endpoints and tests."""

from typing import Annotated, Literal

from pydantic import BaseModel, Field, model_validator

from lead_intelligence.historical_features import HISTORICAL_FINAL_FEATURE_COLUMNS

StrictFiniteFloat = Annotated[float, Field(strict=True, allow_inf_nan=False)]
StrictText = Annotated[str, Field(strict=True, min_length=1, max_length=200)]
StrictHistoricalLabel = Annotated[int, Field(strict=True, ge=0, le=2)]


class HealthResponse(BaseModel):
    """Response returned by the health endpoint."""

    status: Literal["ok"]
    version: str


class HistoricalPredictionRequest(BaseModel):
    """Validated historical XGBoost prediction input."""

    features: dict[str, StrictFiniteFloat]

    @model_validator(mode="after")
    def validate_recovered_feature_schema(self) -> "HistoricalPredictionRequest":
        """Require exactly the recovered 18-feature schema."""
        if set(self.features) != set(HISTORICAL_FINAL_FEATURE_COLUMNS):
            raise ValueError(
                "historical prediction features must match the recovered schema"
            )
        return self


class HistoricalPredictionResponse(BaseModel):
    """Historical XGBoost class prediction returned by the API."""

    predicted_label: Literal[0, 1, 2]


class HistoricalOutreachDraftRequest(BaseModel):
    """Validated historical outreach draft input."""

    lead_name: StrictText
    source: StrictText
    sales_unit: StrictText
    priority: StrictText
    predicted_label: StrictHistoricalLabel

    @model_validator(mode="after")
    def validate_non_blank_context(self) -> "HistoricalOutreachDraftRequest":
        """Reject whitespace-only lead context values."""
        for field in ("lead_name", "source", "sales_unit", "priority"):
            if not getattr(self, field).strip():
                raise ValueError(f"historical outreach field must not be blank: {field}")
        return self


class HistoricalOutreachDraftResponse(BaseModel):
    """Customer-facing outreach draft returned for human review."""

    draft: str


class LeadItem(BaseModel):
    """Synthetic CRM lead item for list and detail views."""

    object_id: str
    lead_id: str
    name: str
    account_name: str = ""
    contact_name: str = ""
    job_title: str = ""
    status: str
    source: str
    priority: str
    start_date: str = ""
    end_date: str = ""
    sales_unit: str = ""
    sales_territory: str = ""
    owner_name: str = ""
    note: str = ""
    features: dict[str, float] = Field(default_factory=dict)
    predicted_label: int = 0
    predicted_class: str = "Other"
    conversion_probability: float = 0.0
    confidence: float = 0.0


class LeadListResponse(BaseModel):
    """List of synthetic leads with ranking and metrics."""

    leads: list[LeadItem]
    total: int


class HistoricalModelMetricsResponse(BaseModel):
    """Model quality and confusion matrix values shown by the dashboard."""

    accuracy: float
    confusion_matrix: list[list[int]]
    labels: list[str]
    training_rows: int


# ── Conversion pipeline schemas (from LeadintelligenceXgboost.ipynb) ─────────


class ConversionPredictRequest(BaseModel):
    """Single-lead prediction input for the binary conversion pipeline."""

    lead_id: str = "new-lead"
    features: dict[str, object]


class ConversionPredictResponse(BaseModel):
    """Single-lead prediction result from the binary conversion pipeline."""

    lead_id: str
    predicted_probability: float
    predicted_converted: int
    lead_score: int
    lead_category: str
    lock_chance_pct: float = 0.0
    confidence_level: str = "Moderate"
    primary_driver: str = ""
    positive_evidence: list[str] = Field(default_factory=list)
    negative_evidence: list[str] = Field(default_factory=list)
    lock_strategy: str = ""


class ConversionBatchPredictRequest(BaseModel):
    """Batch prediction input: list of feature dicts."""

    leads: list[dict[str, object]]


class ConversionBatchPredictResponse(BaseModel):
    """Batch prediction results."""

    results: list[ConversionPredictResponse]
    total: int


class ScoredLeadItem(BaseModel):
    """Pre-scored lead from final_lead_intelligence.csv or live pipeline."""

    sales_rank: int = 0
    lead_id: str = ""
    contact_name: str = ""
    company: str = ""
    job_title: str = ""
    lead_score: int = 0
    lead_category: str = "Cold"
    lock_chance_pct: float = 0.0
    confidence_level: str = "Moderate"
    predicted_probability: float = 0.0
    predicted_converted: int = 0
    actual_converted: int = 0
    primary_driver: str = ""
    positive_evidence: list[str] = Field(default_factory=list)
    negative_evidence: list[str] = Field(default_factory=list)
    lock_strategy: str = ""
    lead_origin: str = ""
    lead_source: str = ""
    last_activity: str = ""
    country: str = ""
    specialization: str = ""
    occupation: str = ""
    city: str = ""
    tags: str = ""
    lead_quality: str = ""
    total_visits: float = 0.0
    total_time_on_website: float = 0.0
    page_views_per_visit: float = 0.0


class ScoredLeadListResponse(BaseModel):
    """List of scored leads from the CSV with total count and category distribution."""

    leads: list[ScoredLeadItem]
    total: int
    category_counts: dict[str, int] = Field(default_factory=dict)


class PipelineDemoSummary(BaseModel):
    """Summary of the 20-lead pipeline verification dataset."""

    total: int = 20
    hot_count: int = 0
    warm_count: int = 0
    cold_count: int = 0
    hot_avg_lock_chance: float = 0.0
    warm_avg_lock_chance: float = 0.0
    cold_avg_lock_chance: float = 0.0


class PipelineDemoResponse(BaseModel):
    """Response containing live pipeline execution results on the 20-lead verification dataset."""

    status: str = "ok"
    pipeline_execution_time_ms: float = 0.0
    summary: PipelineDemoSummary
    leads: list[ScoredLeadItem]


class CleaningReport(BaseModel):
    """Cleaning and preprocessing report generated during dataset injection."""

    total_records: int = 0
    missing_values_imputed: int = 0
    fields_normalized: int = 0
    cleaning_steps: list[str] = Field(default_factory=list)


class InjectedDatasetRequest(BaseModel):
    """Request payload containing raw injected leads or CSV text."""

    leads: list[dict[str, object]] = Field(default_factory=list)
    csv_text: str | None = None


class InjectedPipelineResponse(BaseModel):
    """Final response from cleaning and scoring an injected dataset."""

    status: str = "ok"
    pipeline_execution_time_ms: float = 0.0
    cleaning_report: CleaningReport
    summary: PipelineDemoSummary
    leads: list[ScoredLeadItem]


class ConversionPipelineMetricsResponse(BaseModel):
    """Full pipeline metrics from the notebook metadata."""

    model_name: str = ""
    version: str = ""
    training_date: str = ""
    target_variable: str = ""
    roc_auc_score: float = 0.0
    pr_auc_score: float = 0.0
    brier_score: float = 0.0
    threshold: float = 0.35
    precision: float = 0.0
    recall: float = 0.0
    f1_score: float = 0.0
    hot_threshold: int = 80
    warm_threshold: int = 40
    numerical_features: list[str] = Field(default_factory=list)
    categorical_features: list[str] = Field(default_factory=list)
    description: str = ""
