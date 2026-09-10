# Frontend

React/TypeScript dashboard for the privacy-safe reconstruction.

## Current slice

The historical dashboard displays one synthetic lead and its recovered historical
prediction label, then requests a customer-facing outreach draft from
`POST /historical/outreach-draft`.

The screen currently shows:

- synthetic lead identity;
- source, sales unit, and priority;
- predicted historical class label `0`, `1`, or `2`;
- the reconstructed class meaning;
- loading and unavailable states for outreach drafting; and
- the API-returned outreach draft marked for human review.

The lead and prediction remain fixture-driven. The frontend does **not** yet call
`POST /historical/predict`, load live lead data, send messages, configure
external LLM providers, or reproduce an exact 2024 visual design.

## Run locally

Start the FastAPI service on port `8000`, then run the dashboard:

```bash
cd frontend
npm install
npm run dev
```

During local development, Vite proxies `/historical/*` requests to
`http://127.0.0.1:8000`, so the browser can use the outreach endpoint without
cross-origin configuration.

Use `npm run build` for TypeScript validation and a production Vite build.

## Next slice

Keep the outreach flow intact and connect the historical prediction shown in the
dashboard to the reconstructed prediction API in a separate PR.
