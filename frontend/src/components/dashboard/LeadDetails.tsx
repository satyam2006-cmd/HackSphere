import React, { useState } from "react";
import {
  X,
  Sparkles,
  Send,
  Copy,
  Check,
  ShieldCheck,
  Building,
  User,
  MapPin,
  Calendar,
  AlertCircle,
  FileText,
  BarChart2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LeadItem, OutreachDraftState } from "@/types/crm";

interface LeadDetailsProps {
  lead: LeadItem | null;
  onClose: () => void;
  outreachDraft: OutreachDraftState;
  onGenerateOutreach: (lead: LeadItem) => void;
  onUpdateDraftText?: (draft: string) => void;
  className?: string;
}

export function LeadDetails({
  lead,
  onClose,
  outreachDraft,
  onGenerateOutreach,
  className = "",
}: LeadDetailsProps) {
  const [copied, setCopied] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [editableDraft, setEditableDraft] = useState("");

  if (!lead) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const draftText = outreachDraft.status === "ready" 
    ? (editableDraft || outreachDraft.draft) 
    : "";

  const positiveEvidence = lead.positive_evidence ?? [];
  const negativeEvidence = lead.negative_evidence ?? [];

  return (
    <div className={`w-full shrink-0 bg-white border border-black/10 rounded-2xl flex flex-col min-h-[620px] shadow-sm z-10 transition-all duration-300 ${className}`}>
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] font-mono text-slate-500">
              {lead.lead_id}
            </Badge>
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">
              {lead.predicted_class}
            </Badge>
          </div>
          <h2 className="text-lg font-bold text-slate-900 leading-snug">{lead.name}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{lead.account_name || "Enterprise Lead"}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 text-slate-400 hover:text-slate-700 rounded-full"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Intelligence Score Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              AI Conversion Probability
            </span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
              {Math.round(lead.conversion_probability * 100)}% Likelihood
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-2xl font-bold tracking-tight text-white">
              Target: {lead.predicted_class}
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              {lead.primary_driver || "The model did not return a primary evidence signal for this lead."}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-indigo-800/40 flex items-center justify-between text-xs text-indigo-200">
            <span>Model Confidence: {Math.round(lead.confidence * 100)}%</span>
            <span>{lead.lead_score !== undefined ? `Lead score: ${lead.lead_score}/100` : "Historical scoring"}</span>
          </div>
        </div>

        {/* Prediction Evidence Breakdown */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart2 className="h-4 w-4 text-indigo-600" />
            Decision Factors (Feature Evidence)
          </h3>
          <div className="space-y-2">
            {positiveEvidence.map((evidence, idx) => (
              <div
                key={`positive-${idx}`}
                className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-800">Positive evidence</p>
                  <p className="text-[11px] text-slate-500 font-medium">{evidence}</p>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Supports
                </span>
              </div>
            ))}
            {negativeEvidence.map((evidence, idx) => (
              <div key={`negative-${idx}`} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-800">Negative evidence</p>
                  <p className="text-[11px] text-slate-500 font-medium">{evidence}</p>
                </div>
                <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                  Risk
                </span>
              </div>
            ))}
            {positiveEvidence.length === 0 && negativeEvidence.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-500">
                No evidence was returned by the active scoring pipeline.
              </div>
            )}
          </div>
        </div>

        {lead.lock_strategy && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs">
            <p className="font-bold text-indigo-900">Recommended lock strategy</p>
            <p className="mt-1 text-indigo-800">{lead.lock_strategy}</p>
          </div>
        )}

        {/* Outreach Draft Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Send className="h-4 w-4 text-indigo-600" />
              Outreach Draft
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditableDraft("");
                setReviewed(false);
                onGenerateOutreach(lead);
              }}
              disabled={outreachDraft.status === "loading"}
              className="text-xs h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${outreachDraft.status === "loading" ? "animate-spin" : ""}`} />
              {outreachDraft.status === "loading" ? "Generating..." : "Generate Draft"}
            </Button>
          </div>

          {outreachDraft.status === "loading" && (
            <div className="p-8 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/30 flex flex-col items-center justify-center text-center space-y-2">
              <Sparkles className="h-6 w-6 text-indigo-600 animate-spin" />
              <p className="text-xs font-medium text-slate-700">Synthesizing personalized outreach draft...</p>
              <p className="text-[11px] text-slate-400">Incorporating lead source, sales territory, and priority.</p>
            </div>
          )}

          {outreachDraft.status === "ready" && (
            <div className="space-y-2">
              <div className="relative">
                <textarea
                  rows={6}
                  value={draftText}
                  onChange={(e) => setEditableDraft(e.target.value)}
                  className="w-full text-xs font-sans p-3 rounded-xl border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none leading-relaxed"
                  placeholder="Review or edit generated outreach draft..."
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(draftText)}
                  className="text-xs h-8 border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1 text-slate-500" />
                      Copy Draft
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  onClick={() => setReviewed(true)}
                  className={`text-xs h-8 ${
                    reviewed 
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                  {reviewed ? "Marked as Reviewed" : "Approve & Mark Reviewed"}
                </Button>
              </div>

              <p className="text-[11px] text-slate-400 text-center">
                Human-in-the-loop review required before sending outreach to leads.
              </p>
            </div>
          )}

          {outreachDraft.status === "error" && (
            <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 flex items-start gap-2 text-xs text-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Outreach Generation Unavailable</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  {outreachDraft.error ||
                    "The outreach draft provider is not configured or reachable."}
                </p>
              </div>
            </div>
          )}

          {outreachDraft.status === "idle" && (
            <div className="p-5 rounded-xl border border-dashed border-slate-200 text-center">
              <p className="text-xs text-slate-500">Click "Generate Draft" to create an outreach message tailored to this lead's profile.</p>
            </div>
          )}
        </div>

        {/* Lead Profile Metadata */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Lead Details & Context
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Contact Person</span>
              <p className="font-semibold text-slate-800 mt-0.5 truncate">{lead.contact_name || "N/A"}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Job Title</span>
              <p className="font-semibold text-slate-800 mt-0.5 truncate">{lead.job_title || "N/A"}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Sales Territory</span>
              <p className="font-semibold text-slate-800 mt-0.5 truncate">{lead.sales_territory || "Unassigned"}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Source Channel</span>
              <p className="font-semibold text-slate-800 mt-0.5 truncate">{lead.source}</p>
            </div>
          </div>

          {lead.note && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Note / Inquiry Details</span>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">{lead.note}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
