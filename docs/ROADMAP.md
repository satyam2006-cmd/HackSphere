# Reconstruction Roadmap

The 30-40 hour target is a portfolio-grade MVP, not a production CRM system.

## Milestone 0 - Foundation and safety (3 hours)

- Define the historical and ownership boundary.
- Add data and secret-handling rules.
- Create the application skeleton and smoke test.

## Milestone 1 - Synthetic data and preprocessing (7 hours)

- Define lead, status, reason, activity, and note schemas.
- Generate reproducible synthetic CRM records.
- Validate types, missing values, and allowed categories.
- Split by lead ID before any learned transformation.

## Milestone 2 - Modeling and evaluation (8 hours)

- Establish a simple baseline.
- Train Decision Tree, Random Forest, and XGBoost models.
- Compare accuracy, macro-F1, precision, recall, ROC-AUC, and confusion matrices.
- Record leakage checks, limitations, and feature importance.

## Milestone 3 - Prediction API (6 hours)

- Implement schema-validated prediction endpoints.
- Return probability, thresholded class, model version, and explanation fields.
- Add contract, validation, and error-path tests.

## Milestone 4 - Dashboard and message drafting (8 hours)

- Build a React/TypeScript review flow.
- Show prediction evidence rather than a bare score.
- Add an optional LLM adapter with a deterministic local fallback.
- Require the user to review and edit every generated message.

## Milestone 5 - Delivery quality (6 hours)

- Add Docker Compose and GitHub Actions.
- Document architecture and engineering decisions.
- Record a short demo and add screenshots.
- Run privacy, dependency, and secret checks before public release.

## Definition of done

The MVP is complete when a new contributor can clone the repository, generate
synthetic data, train a model, run the API and UI, execute the tests, and reproduce
the documented metrics without access to any private artifact.
