import React, { useState, useEffect } from "react";
import { apiUrl } from "@/config";
import {
  Send,
  Sparkles,
  Building2,
  Mail,
  Copy,
  Check,
  RefreshCw,
  Target,
  ArrowUpRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LeadItem, OutreachDraftState, SmtpConfig, OutreachEmailSendResult } from "@/types/crm";

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
  // Search & filter state for the left queue
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5; // Exactly 5 leads shown per page

  // Outreach Customization state
  const [channel, setChannel] = useState<"email" | "linkedin" | "phone">("email");
  const [tone, setTone] = useState<"executive" | "consultative" | "urgent">("executive");
  const [editableDraft, setEditableDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [approved, setApproved] = useState(false);

  // SMTP Mailer & Outreach Send state
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig | null>(null);
  const [isSimulate, setIsSimulate] = useState<boolean>(true);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<OutreachEmailSendResult | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Fetch active SMTP configuration
  useEffect(() => {
    fetch(apiUrl("/outreach/smtp/config"))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<SmtpConfig>;
      })
      .then((cfg) => {
        setSmtpConfig(cfg);
        setIsSimulate(cfg.simulate);
      })
      .catch((err) => {
        console.warn("Could not retrieve SMTP configuration:", err);
      });
  }, []);

  // Sync draft text when a new draft is received
  useEffect(() => {
    if (outreachDraft.status === "ready") {
      setEditableDraft(outreachDraft.draft);
      setApproved(false);
    }
  }, [outreachDraft]);

  // Reset editable draft and email fields when selected lead changes
  useEffect(() => {
    setEditableDraft("");
    setApproved(false);
    setSendResult(null);
    setSendError(null);
    if (selectedLead) {
      setRecipientEmail(selectedLead.email || "");
      setEmailSubject(
        `HackSphere Solution Brief: Accelerating Conversion for ${selectedLead.account_name || selectedLead.name}`
      );
    } else {
      setRecipientEmail("");
      setEmailSubject("");
    }
  }, [selectedLead?.object_id, selectedLead?.email]);

  // Filter leads based on category and search
  const filteredLeads = leads.filter((lead) => {
    const category = lead.lead_category || lead.predicted_class || "Other";
    const matchesCategory =
      categoryFilter === "all" || category.toLowerCase() === categoryFilter.toLowerCase();
    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      lead.name.toLowerCase().includes(q) ||
      (lead.account_name || "").toLowerCase().includes(q) ||
      (lead.source || "").toLowerCase().includes(q) ||
      (lead.job_title || "").toLowerCase().includes(q) ||
      (lead.lead_id || "").toLowerCase().includes(q)
    );
  });

  // Reset page when search or category filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  // Strictly 10 leads displayed
  const displayedLeads = filteredLeads.slice(startIndex, startIndex + pageSize);

  const handleCopy = () => {
    const textToCopy = editableDraft || (outreachDraft.status === "ready" ? outreachDraft.draft : "");
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendEmail = async () => {
    const targetEmail = recipientEmail.trim();
    if (!targetEmail) {
      setSendError("Recipient email address must not be blank.");
      return;
    }
    const draftText = editableDraft || (outreachDraft.status === "ready" ? outreachDraft.draft : "");
    if (!draftText.trim()) {
      setSendError("Email draft content is required before sending.");
      return;
    }

    setSending(true);
    setSendError(null);
    setSendResult(null);

    try {
      const res = await fetch(apiUrl("/outreach/send-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_email: targetEmail,
          subject: emailSubject.trim() || `Outreach for ${selectedLead?.name}`,
          body: draftText,
          lead_id: selectedLead?.lead_id || "",
          force_simulate: isSimulate,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Send failed with code ${res.status}`);
      }

      const result: OutreachEmailSendResult = await res.json();
      setSendResult(result);
      setApproved(true);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "Hot":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "Warm":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Cold":
        return "bg-sky-50 text-sky-700 border-sky-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <section className="space-y-6">
      {/* 1. TOP BANNER: Clean Rectangular Black-Border Header */}
      <div className="bg-white rounded-2xl border-2 border-black p-5 sm:p-6 shadow-none">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-black text-white">
                <Sparkles className="h-3.5 w-3.5" />
                AI Outreach Studio
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Top 10 Actionable Queue
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Grounded in TreeSHAP Signals
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 pt-1">
              Personalized Multi-Channel Outreach Studio
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Select any candidate from the prioritized top 10 queue to review decision drivers, customize tone, and synthesize bespoke outreach drafts for human review.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            {smtpConfig && (
              <div className="p-2.5 rounded-xl border border-black/20 bg-slate-50 text-xs flex flex-col gap-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <span className={`h-2 w-2 rounded-full ${smtpConfig.is_configured ? "bg-emerald-500" : "bg-amber-500"}`} />
                  <span>SMTP: {smtpConfig.host || "smtp.gmail.com"}:{smtpConfig.port}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-600">
                  <span className="truncate max-w-[140px]" title={smtpConfig.user}>
                    {smtpConfig.user || "Configured"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSimulate(!isSimulate)}
                    className={`px-2 py-0.5 rounded font-bold border transition-colors ${
                      isSimulate
                        ? "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200"
                        : "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200"
                    }`}
                  >
                    {isSimulate ? "Simulate Mode" : "Live SMTP"}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="p-3 rounded-xl border-2 border-black bg-slate-50 text-center min-w-[90px]">
                <p className="text-[10px] uppercase font-bold text-slate-500">Pipeline Leads</p>
                <p className="text-base font-black text-black">{leads.length}</p>
              </div>
              <div className="p-3 rounded-xl border-2 border-black bg-slate-50 text-center min-w-[90px]">
                <p className="text-[10px] uppercase font-bold text-slate-500">Actionable Now</p>
                <p className="text-base font-black text-rose-600">
                  {leads.filter((l) => (l.lead_category || l.predicted_class) === "Hot" || l.conversion_probability >= 0.7).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN TWO-COLUMN WORKSPACE */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* LEFT COLUMN: Strictly 10 Leads Queue with Search & Pagination */}
        <div className="bg-white rounded-2xl border-2 border-black p-4 shadow-none flex flex-col h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-black text-white">
                <Send className="h-3.5 w-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Priority Outreach Queue</h3>
                <p className="text-[11px] text-slate-400">5 actionable candidates per page</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
              {filteredLeads.length} total
            </span>
          </div>

          {/* Quick Search */}
          <div className="pt-3 pb-2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-50 border-slate-200 focus-visible:ring-black"
              />
            </div>
          </div>

          {/* Tier Filter Pills */}
          <div className="flex items-center gap-1 pb-3 pt-1 border-b border-slate-100">
            {["all", "Hot", "Warm", "Cold"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  categoryFilter === cat
                    ? "bg-black text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>

          {/* Exactly 5 Leads Listed */}
          <div className="space-y-2 py-3 min-h-[320px]">
            {displayedLeads.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No candidates match your filter.
              </div>
            ) : (
              displayedLeads.map((lead) => {
                const isSelected = selectedLead?.object_id === lead.object_id;
                const cat = lead.lead_category || lead.predicted_class || "Other";
                const probPct = Math.round(lead.conversion_probability * 100);

                return (
                  <button
                    key={lead.object_id}
                    onClick={() => onSelectLead(lead)}
                    className={`w-full text-left p-3 rounded-xl transition-all border ${
                      isSelected
                        ? "bg-black text-white border-black shadow-sm"
                        : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isSelected ? "text-white" : "text-slate-900"}`}>
                          {lead.name}
                        </p>
                        <p className={`text-[11px] truncate flex items-center gap-1 mt-0.5 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                          <Building2 className="h-3 w-3 shrink-0" />
                          {lead.account_name || "Enterprise Account"}
                        </p>
                        {lead.email && (
                          <p className={`text-[10px] truncate flex items-center gap-1 mt-0.5 ${isSelected ? "text-indigo-200 font-medium" : "text-indigo-600 font-medium"}`}>
                            <Mail className="h-2.5 w-2.5 shrink-0" />
                            {lead.email}
                          </p>
                        )}
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                          isSelected
                            ? "bg-white/20 text-white border-white/30"
                            : getCategoryBadgeClass(cat)
                        }`}
                      >
                        {cat}
                      </span>
                    </div>

                    <div className="mt-2 pt-2 border-t flex items-center justify-between text-[11px] opacity-80"
                      style={{ borderColor: isSelected ? "rgba(255,255,255,0.15)" : "#f1f5f9" }}
                    >
                      <span className="font-semibold">{probPct}% Likelihood</span>
                      <span className="truncate max-w-[130px]">{lead.source}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Pagination Footer: 5 per page with prominent Prev and Next buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page <strong className="text-slate-900">{currentPage}</strong> of <strong className="text-slate-900">{totalPages}</strong>
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-8 px-2.5 text-xs bg-white border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-30 flex items-center gap-1"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 px-3 text-xs bg-black text-white hover:bg-black/85 disabled:opacity-30 font-semibold flex items-center gap-1 shadow-xs"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: The Outreach Drafting Studio */}
        {selectedLead ? (
          <div className="bg-white rounded-2xl border-2 border-black p-5 sm:p-6 shadow-none flex flex-col space-y-5">
            {/* Lead Dossier Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] font-mono text-slate-600 border-slate-300">
                    {selectedLead.lead_id}
                  </Badge>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(
                      selectedLead.lead_category || selectedLead.predicted_class || "Other"
                    )}`}
                  >
                    {selectedLead.lead_category || selectedLead.predicted_class} Tier
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    {Math.round(selectedLead.conversion_probability * 100)}% Likelihood
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">{selectedLead.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>{selectedLead.job_title || "Decision Maker"}</span>
                  <span>•</span>
                  <span>{selectedLead.account_name || "Enterprise Account"}</span>
                  <span>•</span>
                  <span>{selectedLead.sales_territory || selectedLead.sales_unit || "Direct"}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => onGenerateOutreach(selectedLead)}
                  disabled={outreachDraft.status === "loading"}
                  className="bg-black hover:bg-black/85 text-white text-xs font-bold h-9 px-4 rounded-xl shadow-xs flex items-center gap-2"
                >
                  {outreachDraft.status === "loading" ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {outreachDraft.status === "loading" ? "Synthesizing Draft…" : "Generate AI Outreach"}
                </Button>
              </div>
            </div>

            {/* TreeSHAP Signals Grounding Context */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-black" />
                  Attributed Decision Signals for this Lead
                </span>
                <span className="text-[11px] text-slate-500">
                  Confidence: {Math.round(selectedLead.confidence * 100)}%
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-slate-500">Primary Conversion Driver:</p>
                  <p className="font-semibold text-slate-900 bg-white p-2 rounded-lg border border-slate-200">
                    {selectedLead.primary_driver || "High inbound intent & engagement threshold"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-slate-500">Recommended Lock Strategy:</p>
                  <p className="font-semibold text-slate-900 bg-white p-2 rounded-lg border border-slate-200">
                    {selectedLead.lock_strategy || "Conduct executive solution briefing & prepare formal quotation"}
                  </p>
                </div>
              </div>

              {selectedLead.positive_evidence && selectedLead.positive_evidence.length > 0 && (
                <div className="pt-1 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-emerald-800">Positive Factors:</span>
                  {selectedLead.positive_evidence.map((ev, i) => (
                    <span key={i} className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-medium">
                      + {ev}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Outreach Channel & Tone Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Channel Format:
                </label>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {[
                    { id: "email", label: "Executive Email", icon: Mail },
                    { id: "linkedin", label: "LinkedIn InMail", icon: Globe },
                    { id: "phone", label: "Call Script", icon: Clock },
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => setChannel(ch.id as typeof channel)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                        channel === ch.id
                          ? "bg-white text-black shadow-xs"
                          : "text-slate-500 hover:text-black"
                      }`}
                    >
                      <ch.icon className="h-3 w-3" />
                      <span>{ch.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tone &amp; Angle:
                </label>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {[
                    { id: "executive", label: "Direct" },
                    { id: "consultative", label: "Consultative" },
                    { id: "urgent", label: "High Urgency" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTone(t.id as typeof tone)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-all ${
                        tone === t.id
                          ? "bg-white text-black shadow-xs"
                          : "text-slate-500 hover:text-black"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Draft Output Studio */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-black" />
                  Synthesized Outreach Draft
                </span>

                {outreachDraft.status === "ready" && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      className="h-8 px-3 text-xs border-slate-200 bg-white hover:bg-slate-100 text-slate-800 rounded-lg flex items-center gap-1.5"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied!" : "Copy Draft"}
                    </Button>

                    <Button
                      size="sm"
                      onClick={handleSendEmail}
                      disabled={sending || approved}
                      className="h-8 px-3.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-xs"
                    >
                      {sending ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : approved ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      {sending
                        ? "Dispatching via SMTP…"
                        : approved
                        ? "Sent Successfully!"
                        : isSimulate
                        ? "Simulate Outreach Send"
                        : "Send Live via SMTP"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Recipient & Subject Configuration when in Email Mode */}
              {channel === "email" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Recipient Email:
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="lead.recipient@company.com"
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:border-black text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Email Subject:
                    </label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Subject line..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:border-black text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Dispatch Feedback Alert */}
              {sendResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                    sendResult.status === "sent"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                      : "bg-sky-50 border-sky-300 text-sky-900"
                  }`}
                >
                  <CheckCircle2
                    className={`h-4 w-4 shrink-0 mt-0.5 ${
                      sendResult.status === "sent" ? "text-emerald-600" : "text-sky-600"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="font-bold">
                      {sendResult.status === "sent"
                        ? "Outreach Email Successfully Dispatched via SMTP!"
                        : "Outreach Delivery Simulated Successfully"}
                    </p>
                    <p className="text-[11px] mt-0.5">
                      Recipient: <strong className="font-mono">{sendResult.recipient}</strong> • Message ID:{" "}
                      <strong className="font-mono">{sendResult.message_id}</strong>
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">{sendResult.details}</p>
                  </div>
                </div>
              )}

              {sendError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{sendError}</span>
                </div>
              )}

              {outreachDraft.status === "loading" ? (
                <div className="p-12 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-center space-y-2">
                  <RefreshCw className="h-8 w-8 text-black animate-spin" />
                  <p className="text-sm font-bold text-slate-900">Synthesizing personalized outreach draft...</p>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Grounded in {selectedLead.name}&apos;s conversion score, territory, and verified buying signals.
                  </p>
                </div>
              ) : outreachDraft.status === "ready" ? (
                <div className="space-y-2">
                  <textarea
                    value={editableDraft}
                    onChange={(e) => setEditableDraft(e.target.value)}
                    rows={11}
                    className="w-full font-sans text-xs sm:text-sm p-4 rounded-xl border-2 border-black/20 focus:border-black bg-white shadow-inner focus:outline-none text-slate-900 leading-relaxed transition-colors"
                  />
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{editableDraft.split(/\s+/).filter(Boolean).length} words</span>
                    <span>Ready for human review before transmission</span>
                  </div>
                </div>
              ) : (
                <div className="p-10 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-center space-y-3">
                  <Sparkles className="h-8 w-8 text-slate-400" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">No Draft Generated Yet</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs">
                      Click &quot;Generate AI Outreach&quot; above to synthesize custom copy tailored specifically to this lead.
                    </p>
                  </div>
                  <Button
                    onClick={() => onGenerateOutreach(selectedLead)}
                    className="bg-black hover:bg-black/85 text-white text-xs font-bold h-8 px-4 rounded-lg"
                  >
                    Generate Now
                  </Button>
                </div>
              )}

              {outreachDraft.status === "error" && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{outreachDraft.error || "Failed to generate outreach"}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty Workspace Prompt when no lead selected */
          <div className="bg-white rounded-2xl border-2 border-black p-8 sm:p-12 shadow-none min-h-[500px] flex flex-col items-center justify-center text-center">
            <div className="p-4 rounded-2xl border-2 border-black bg-slate-50 mb-4">
              <Sparkles className="h-8 w-8 text-black" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Select an Actionable Lead</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1.5 leading-relaxed">
              Click any of the top 10 prioritized candidates from the queue on the left to review their model attributes and synthesize tailored communication.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg mt-8">
              <div className="p-3.5 rounded-xl border-2 border-black bg-slate-50 text-center">
                <p className="text-xl font-black text-slate-900">{leads.length}</p>
                <p className="text-[11px] font-semibold text-slate-500 uppercase mt-0.5">Scored Pipeline</p>
              </div>
              <div className="p-3.5 rounded-xl border-2 border-black bg-slate-50 text-center">
                <p className="text-xl font-black text-rose-600">
                  {leads.filter((l) => (l.lead_category || l.predicted_class) === "Hot").length}
                </p>
                <p className="text-[11px] font-semibold text-slate-500 uppercase mt-0.5">Hot Targets</p>
              </div>
              <div className="p-3.5 rounded-xl border-2 border-black bg-slate-50 text-center">
                <p className="text-xl font-black text-slate-900">10</p>
                <p className="text-[11px] font-semibold text-slate-500 uppercase mt-0.5">Per-Page Queue</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
