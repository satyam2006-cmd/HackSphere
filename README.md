# HackSphere

HackSphere is a privacy-safe lead conversion platform built with synthetic CRM
data. It combines a reproducible machine-learning pipeline, prediction API,
web dashboard, and reviewable outreach message generation.

## Why this project exists

Sales teams often have more leads than they can review manually. This project
explores how a team could prioritize leads, understand the factors behind a
prediction, and draft a reviewable outreach message without exposing personal or
corporate data.

## Planned user flow

1. Generate privacy-safe raw-like lead and lead-note data.
2. Join leads and notes through the `ObjectID` -> `ParentObjectID` relationship.
3. Reduce the data with leakage safeguards.
4. Compare baseline, Random Forest, and XGBoost classifiers.
5. Request a conversion prediction through a FastAPI endpoint.
6. Review model evidence in a React/TypeScript dashboard.
7. Generate an editable outreach draft through an optional LLM adapter.

## Reconstruction goals

- Use a documented public schema and aggregate distributions without publishing
  source records.
- Preserve the distinction between wide raw CRM data and the smaller modeling
  dataset rather than designing directly around today's feature subset.
- Prevent entity and target leakage by splitting at lead level and excluding
  post-outcome information.
- Separate preprocessing fitted on training data from evaluation data.
- Report macro-F1, recall, precision, ROC-AUC, and a confusion matrix in addition
  to accuracy.
- Treat generated messages as human-reviewed drafts, not autonomous decisions.
- Keep the project reproducible with tests, Docker, and GitHub Actions.

## Current status

**Phase 1 - calibrated synthetic data foundation**

- [x] Public/private data boundary documented
- [x] Minimal API health endpoint and test added
- [x] Lead/note raw shape and join relationship implemented
- [x] Aggregate CRM profile documented
- [x] Privacy-safe synthetic generator calibrated to observed aggregate behavior
- [ ] Historical join/reduction and leakage-safe preprocessing
- [ ] Reproducible EDA summary and diagnostic charts
- [ ] Model baselines and experiment report
- [ ] Prediction and explanation endpoints
- [ ] React/TypeScript dashboard
- [ ] Optional LLM message adapter
- [ ] Docker Compose and CI workflow

See the [project status and roadmap](docs/DOCUMENT.md) for what is complete and
what remains. The original [technical roadmap](docs/ROADMAP.md) is also retained
for milestone planning.

## Running the Application

### 1. Backend (FastAPI & ML Inference Engine)

Navigate to `src/lead_intelligence` and run the Uvicorn server:

```powershell
cd src/lead_intelligence
python -m uvicorn lead_intelligence.api:app
```

The API service will start on `http://127.0.0.1:8000`. You can inspect API health at `/health` and interactive OpenAPI documentation at `http://127.0.0.1:8000/docs`.

### 2. Frontend (React + Vite Web Dashboard)

In a separate terminal from the repository root:

```powershell
cd frontend
npm run dev
```

The web dashboard will be available at `http://localhost:5173`.

### 3. Running Tests

```powershell
pytest
```

## Synthetic CRM data

The data workflow uses a wide `leads.csv` export
(86,244 rows x 181 columns) and a one-to-many `lead_notes.csv` export
(134,793 rows x 16 columns). The two were joined through
`ObjectID = ParentObjectID`, then reduced to a smaller working dataset.

The project keeps that separation and calibrates several synthetic properties,
including:

- the five observed workflow status proportions;
- all 39 observed `Source_Text` frequencies;
- the share of leads with note rows and average note count;
- field-specific missingness for the working cohort;
- observed cardinality/skew for owner, sales-unit, territory, and lead-name
  fields;
- mixed date formatting, language proportions, and dirty note placeholders.

All records are newly generated. No customer or employee names, identifiers, or
free-text notes are copied from an external dataset.

Small matching examples are committed at:

- `data/synthetic/leads_sample.csv`
- `data/synthetic/lead_notes_sample.csv`

See [Synthetic CRM specification](docs/DATA_PIPELINE.md) and
[CRM aggregate profile](docs/HISTORICAL_DATA_PROFILE.md) for implementation
details.

## Repository boundaries

- `src/lead_intelligence/`: Python application and ML code
- `tests/`: automated tests
- `frontend/`: planned React/TypeScript client
- `data/synthetic/`: generated, non-identifying samples only
- `docs/`: data policy, project planning, and engineering decisions

For handling rules, see the [Data and secrets policy](docs/DATA_POLICY.md).

## License

No license has been selected yet. Copyright, licensing, and attribution boundaries
will be reviewed before any external reuse or distribution.
