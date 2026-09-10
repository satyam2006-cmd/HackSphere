import React from "react";
import { Send, Sparkles } from "lucide-react";
import { LeadDetails } from "@/components/dashboard/LeadDetails";
import { Button } from "@/components/ui/button";
import { LeadItem, OutreachDraftState } from "@/types/crm";

interface OutreachPageProps {
  leads: LeadItem[];
  selectedLead: LeadItem | null;
  outreachDraft: OutreachDraftState;
  onSelectLead: (lead: LeadItem) => void;
  onGenerateOutreach: (lead: LeadItem) => void;
}

export function OutreachPage({
  leads,
  selectedLead,
  outreachDraft,
  onSelectLead,
  onGenerateOutreach,
}: OutreachPageProps) {
  return (
    <section className="space-y-5">
      <div className="border-b border-black/10 pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-black/50">
          Outreach Center
        </p>
        <h2 className="mt-2 text-3xl font-bold text-black">Create a reviewable draft</h2>
        <p className="mt-2 max-w-2xl text-sm text-black/60">
          Choose a scored lead, generate a local outreach message, and edit it
          before sending. No external provider is required.
        </p>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(220px,300px)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-black/10 bg-white p-3">
          <div className="mb-3 flex items-center gap-2 px-2">
            <Send className="h-4 w-4" />
            <h3 className="text-sm font-bold">Scored leads</h3>
          </div>
          <div className="space-y-2">
            {leads.map((lead) => (
              <Button
                key={lead.object_id}
                variant="ghost"
                onClick={() => onSelectLead(lead)}
                className={`h-auto w-full justify-start rounded-xl px-3 py-3 text-left ${
                  selectedLead?.object_id === lead.object_id
                    ? "bg-black text-white hover:bg-black/90 hover:text-white"
                    : "text-black hover:bg-black/5"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold">{lead.name}</span>
                  <span className="mt-1 block text-[11px] opacity-60">
                    {Math.round(lead.conversion_probability * 100)}% likelihood
                  </span>
                </span>
              </Button>
            ))}
          </div>
        </div>

        {selectedLead ? (
          <LeadDetails
            lead={selectedLead}
            onClose={() => undefined}
            outreachDraft={outreachDraft}
            onGenerateOutreach={onGenerateOutreach}
            className="min-w-0"
          />
        ) : (
          <div className="grid min-h-[420px] grid-cols-2 gap-5 rounded-2xl border border-black/10 bg-white p-8">
            <div className="flex flex-col justify-center">
              <Sparkles className="h-8 w-8" />
              <p className="mt-4 text-2xl font-bold">Your outreach workspace</p>
              <p className="mt-2 max-w-md text-sm leading-6 text-black/60">
                Select a scored lead to review model context and generate a
                personalized draft for human approval.
              </p>
            </div>
            <div className="grid content-center gap-3">
              {[
                ["20", "Scored leads"],
                ["18", "Model features"],
                ["Local", "Draft provider"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-xl border border-black/10 bg-black/[0.03] p-4">
                  <p className="text-xl font-bold">{value}</p>
                  <p className="mt-1 text-xs text-black/55">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
