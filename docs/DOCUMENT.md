# HackSphere Project Status and Roadmap

## 1. Purpose

HackSphere is a CRM lead conversion intelligence platform. Its purpose is to help
sales teams decide which leads deserve attention first, understand why a lead was
classified, and prepare a reviewable outreach message.

The current implementation uses synthetic CRM data. It does not use private
customer records, credentials, or production CRM connections.

## 2. Current release

**Release:** `v1.0.0`

**Repository:** `https://github.com/satyam2006-cmd/HackSphere`

**Current state:** Working demonstration and portfolio MVP vertical slice.

The backend, frontend, API proxy, tests, and release tag have been verified. The
application demonstrates the main decision-support flow, but it is not yet a full
multi-lead production CRM system.

## 3. What has been made

### Project foundation

- Fresh Git history created for HackSphere.
- Previous repository history and non-English project documentation removed.
- English-only project documentation and source text.
- Privacy and synthetic-data boundaries documented.
- Python project configuration and development dependencies defined.

### Synthetic CRM data

- Synthetic lead and lead-note schemas defined.
- Sample lead and note CSV files included.
- Lead-to-note relationship represented through `ObjectID` and
  `ParentObjectID`.
- Synthetic status, source, note, missing-value, and categorical behavior
  supported.
- No private customer or employee records included.

### Data and machine-learning pipeline

- Historical-style feature reconstruction modules implemented.
- Lead status target reconstruction implemented for three classes.
- Note labels, categorical features, due-day values, and sealing amounts are
  reconstructed.
- XGBoost training and prediction helpers implemented.
- Feature schema validation implemented.
- Tests cover the recovered transformation stages and prediction contract.

### Backend API

FastAPI currently provides:

- `GET /` - API identity and useful links.
- `GET /health` - service health and version.
- `POST /historical/predict` - prediction from the recovered feature schema.
- `POST /historical/outreach-draft` - reviewable outreach draft generation.
- `GET /docs` - interactive OpenAPI documentation.

The API validates required fields, rejects incorrect feature schemas, rejects
non-finite numeric values, and returns controlled validation responses.

### Frontend

The React/Vite dashboard currently displays:

- One synthetic lead fixture.
- Lead source, sales unit, and priority.
- Predicted historical class and its meaning.
- Outreach draft loading, success, and unavailable states.
- Human-review messaging for generated outreach.

The Vite development server proxies `/historical/*` requests to FastAPI.

### Verification completed

- Complete Python test suite passes.
- Frontend production build passes.
- Backend root and health endpoints return `200`.
- Frontend serves successfully.
- Frontend proxy reaches the backend outreach endpoint successfully.
- Release tag `v1.0.0` is published.

## 4. What is partially complete

These parts work in a controlled demonstration but are not yet production-ready:

- The dashboard uses one hard-coded synthetic lead instead of a lead list.
- The displayed prediction is fixture-driven rather than requested dynamically
  from `/historical/predict`.
- The backend does not yet load a trained model automatically during startup.
- There is no persistent database or CRM import flow.
- Outreach generation uses a deterministic local fallback unless an external
  provider is configured.
- The dashboard has no authentication, user roles, or audit history.
- The model has no production monitoring or retraining workflow.

## 5. What remains to be built

### Priority 1: Make the demo a real multi-lead workflow

1. Add a backend endpoint to list synthetic leads.
2. Add a backend endpoint to return one lead's details and features.
3. Replace the fixture lead in the dashboard with API-loaded data.
4. Add lead selection, sorting, filtering, and search.
5. Show conversion probability or confidence alongside the predicted class.
6. Call `/historical/predict` from the frontend instead of using a hard-coded label.
7. Show the features or evidence that influenced the prediction.

**Done when:** a user can open the dashboard, view several leads, sort them by
conversion likelihood, select one, inspect its evidence, and request an outreach
draft.

### Priority 2: Add reproducible model training

1. Add a command that generates the synthetic dataset.
2. Add a command that preprocesses the dataset.
3. Add a command that trains the baseline and XGBoost models.
4. Save the trained model with a version and metadata file.
5. Load the model when the API starts.
6. Record evaluation metrics, feature names, training date, and data version.
7. Add a model artifact or documented local development strategy.

**Done when:** a new contributor can generate data, train a model, start the API,
and receive predictions without manually changing application code.

### Priority 3: Improve data and model quality

1. Add an explicit train/validation/test split by lead ID.
2. Produce an EDA report for status balance, missing values, and source mix.
3. Compare a simple baseline, Random Forest, and XGBoost.
4. Report macro-F1, precision, recall, ROC-AUC, and confusion matrix.
5. Add probability calibration and threshold selection.
6. Document known bias, class imbalance, and synthetic-data limitations.
7. Add regression checks for leakage and feature drift.

**Done when:** model quality can be reproduced from a documented command and the
metrics are visible in a committed report.

### Priority 4: Complete the CRM experience

1. Add CSV upload and validation for approved synthetic or user-provided data.
2. Add lead status and follow-up fields.
3. Add notes and activity history.
4. Add a lead detail page.
5. Add a prioritized work queue for sales users.
6. Allow users to edit and save outreach drafts.
7. Add export of selected leads and reviewed drafts.

**Done when:** a sales user can move from an imported lead list to a prioritized,
reviewed follow-up queue without editing code.

### Priority 5: Production readiness

1. Add Docker Compose for backend and frontend.
2. Add CI for tests, linting, type checking, and frontend build.
3. Add environment-variable validation and secret scanning.
4. Add structured logging and request IDs.
5. Add authentication and authorization if deployed for multiple users.
6. Add database migrations and backup strategy.
7. Add monitoring for API errors, latency, model drift, and prediction volume.
8. Review dependency vulnerabilities and pin release dependencies.

**Done when:** the application can be deployed repeatedly with documented
configuration, health checks, logs, tests, and rollback instructions.

## 6. Recommended implementation order

### Milestone A: Live multi-lead demo

Build the lead-list endpoint, frontend data loading, sorting, filtering, dynamic
prediction, and prediction evidence. This gives the problem statement a clear,
visible answer: the system helps sales teams prioritize leads.

### Milestone B: Reproducible model workflow

Add dataset generation, training, evaluation, saved model artifacts, and API
startup loading. This makes the intelligence reproducible rather than fixture-based.

### Milestone C: Sales workflow

Add lead details, notes, follow-up state, editable drafts, and export. This turns
the prediction screen into a useful work queue.

### Milestone D: Delivery and deployment

Add Docker, CI, security checks, observability, and deployment documentation.

## 7. Definition of complete for the problem statement

HackSphere can be considered complete for the stated CRM lead conversion problem
when all of the following are true:

- A user can upload or generate a lead dataset.
- The system validates and preprocesses the data without target leakage.
- The system ranks multiple leads by conversion likelihood.
- Each prediction includes a class, probability, and understandable evidence.
- A sales user can filter the queue by priority, source, and predicted value.
- A user can generate, edit, and mark an outreach draft as reviewed.
- Model metrics are reproducible and visible.
- The application has tests, health checks, deployment instructions, and no
  secrets or private records in the repository.

## 8. Short version

**Already made:** synthetic CRM foundation, reconstruction pipeline, prediction
API, outreach API, React dashboard, tests, integration verification, and `v1.0.0`.

**Next most important work:** replace the single fixture lead with a real list of
leads, dynamically request predictions, rank the leads, and show prediction
reasons. This is the highest-value next step because it directly demonstrates
lead prioritization for sales teams.
