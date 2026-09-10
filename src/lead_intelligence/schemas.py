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
