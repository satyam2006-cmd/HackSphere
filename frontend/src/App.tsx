import { useEffect, useState } from "react";

type HistoricalPredictedLabel = 0 | 1 | 2;

type LeadSummary = {
  leadId: string;
  name: string;
  source: string;
  salesUnit: string;
  priority: string;
  predictedLabel: HistoricalPredictedLabel;
};

type OutreachDraftState =
  | { status: "loading" }
  | { status: "ready"; draft: string }
  | { status: "error" };

const reconstructionLead: LeadSummary = {
  leadId: "SYN-2024-001",
  name: "Northstar Manufacturing",
  source: "Industry event",
  salesUnit: "Central Europe",
  priority: "High",
  predictedLabel: 2,
};

const predictionCopy: Record<
  HistoricalPredictedLabel,
  { title: string; description: string }
> = {
  0: {
    title: "Other",
    description: "No historical qualified or converted outcome is represented.",
  },
  1: {
    title: "Converted",
    description: "Historical target class for a converted lead outcome.",
  },
  2: {
    title: "Qualified",
    description: "Historical target class for a qualified lead outcome.",
  },
};

/** Fetch one reviewable outreach draft for the current reconstruction lead. */
async function fetchHistoricalOutreachDraft(signal: AbortSignal): Promise<string> {
  const response = await fetch("/historical/outreach-draft", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      lead_name: reconstructionLead.name,
      source: reconstructionLead.source,
      sales_unit: reconstructionLead.salesUnit,
      priority: reconstructionLead.priority,
      predicted_label: reconstructionLead.predictedLabel,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`historical outreach draft request failed: ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("draft" in payload) ||
    typeof payload.draft !== "string" ||
    !payload.draft.trim()
  ) {
    throw new Error("historical outreach draft response is invalid");
  }

  return payload.draft;
}

/** Render the privacy-safe historical lead, prediction, and outreach review flow. */
export function App() {
  const prediction = predictionCopy[reconstructionLead.predictedLabel];
  const [outreachDraft, setOutreachDraft] = useState<OutreachDraftState>({
    status: "loading",
  });

  useEffect(() => {
    const controller = new AbortController();

    setOutreachDraft({ status: "loading" });
    fetchHistoricalOutreachDraft(controller.signal)
      .then((draft) => {
        setOutreachDraft({ status: "ready", draft });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setOutreachDraft({ status: "error" });
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <main className="page-shell">
      <section className="dashboard" aria-labelledby="dashboard-title">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">2024 reconstruction</p>
            <h1 id="dashboard-title">Lead conversion review</h1>
            <p className="intro">
              Privacy-safe preview of the lead, prediction, and outreach review flow.
            </p>
          </div>
          <span className="fixture-label">Synthetic fixture</span>
        </header>

        <article className="lead-card">
          <div className="lead-heading">
            <div>
              <p className="section-label">Lead</p>
              <h2>{reconstructionLead.name}</h2>
              <p className="lead-id">{reconstructionLead.leadId}</p>
            </div>

            <div
              className="prediction-badge"
              aria-label={`Predicted label ${reconstructionLead.predictedLabel}: ${prediction.title}`}
            >
              <span>Predicted label</span>
              <strong>{reconstructionLead.predictedLabel}</strong>
              <small>{prediction.title}</small>
            </div>
          </div>

          <dl className="lead-details">
            <div>
              <dt>Source</dt>
              <dd>{reconstructionLead.source}</dd>
            </div>
            <div>
              <dt>Sales unit</dt>
              <dd>{reconstructionLead.salesUnit}</dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>{reconstructionLead.priority}</dd>
            </div>
          </dl>

          <footer className="prediction-note">
            <span>Historical class meaning</span>
            <p>{prediction.description}</p>
          </footer>
        </article>

        <article className="outreach-card" aria-labelledby="outreach-title">
          <div className="outreach-heading">
            <div>
              <p className="section-label">Outreach draft</p>
              <h2 id="outreach-title">Customer message review</h2>
            </div>
            <span className="review-label">Human review required</span>
          </div>

          <div className="draft-copy" aria-live="polite">
            {outreachDraft.status === "loading" && (
              <p className="draft-status">Loading outreach draft...</p>
            )}
            {outreachDraft.status === "error" && (
              <p className="draft-status">
                Outreach draft is unavailable. Confirm that the reconstruction API is
                running and try again.
              </p>
            )}
            {outreachDraft.status === "ready" && (
              <p className="draft-text">{outreachDraft.draft}</p>
            )}
          </div>

          <footer className="outreach-note">
            This panel loads its reconstruction draft from the historical outreach API.
            The returned message still requires human review before use.
          </footer>
        </article>
      </section>
    </main>
  );
}
