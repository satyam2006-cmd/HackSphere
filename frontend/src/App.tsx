import React, { useEffect, useState, useCallback, useRef } from "react";
import { PillNav } from "@/components/layout/PillNav";
import { KPIStats } from "@/components/dashboard/KPIStats";
import { LeadsTable } from "@/components/dashboard/LeadsTable";
import { LeadDetails } from "@/components/dashboard/LeadDetails";
import { OutreachPage } from "@/components/dashboard/OutreachPage";
import { ConversionPanel } from "@/components/dashboard/ConversionPanel";
import { LeadItem, ModelMetrics, OutreachDraftState, LeadListResponse, InjectedPipelineResponse, ScoredLead, CleaningReport, PipelineDemoSummary } from "@/types/crm";
import {
  Sparkles,
  Download,
  RefreshCw,
  AlertCircle,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { apiUrl } from "./config";

export function App() {
  const [currentTab, setCurrentTab] = useState("analytics");
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [outreachLead, setOutreachLead] = useState<LeadItem | null>(null);
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);
  const [intelligenceLeads, setIntelligenceLeads] = useState<LeadItem[]>([]);
  const [uploadedScoredLeads, setUploadedScoredLeads] = useState<ScoredLead[]>([]);
  const [uploadedRawInput, setUploadedRawInput] = useState("");
  const [uploadedCleaningReport, setUploadedCleaningReport] = useState<CleaningReport | null>(null);
  const [uploadedSummary, setUploadedSummary] = useState<PipelineDemoSummary | null>(null);
  const [uploadedExecutionMs, setUploadedExecutionMs] = useState<number | null>(null);
  const inputFileRef = useRef<HTMLInputElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("conversion_probability");

  // Outreach Draft state
  const [outreachDraft, setOutreachDraft] = useState<OutreachDraftState>({
    status: "idle",
  });

  // Fetch leads from backend
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchQuery) params.append("query", searchQuery);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (priorityFilter !== "all") params.append("priority", priorityFilter);
      params.append("sort_by", sortBy);

      const res = await fetch(apiUrl(`/historical/leads?${params.toString()}`));
      if (!res.ok) {
        throw new Error(`Failed to load leads: ${res.status}`);
      }
      const data: LeadListResponse = await res.json();
      setLeads(data.leads);

      if (selectedLead) {
        // Keep selected lead updated
        const updated = data.leads.find((l) => l.object_id === selectedLead.object_id);
        setSelectedLead(updated ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, priorityFilter, sortBy]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    // Keep browser refreshes on the analytics dashboard instead of restoring an old nav hash.
    window.history.replaceState(null, "", window.location.pathname);
    setCurrentTab("analytics");
  }, []);

  useEffect(() => {
    fetch(apiUrl("/historical/model-metrics"))
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load model metrics: ${response.status}`);
        return response.json() as Promise<ModelMetrics>;
      })
      .then(setModelMetrics)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load model metrics");
      });
  }, []);

  // Generate outreach draft for a selected lead
  const handleGenerateOutreach = async (lead: LeadItem) => {
    try {
      setOutreachDraft({ status: "loading" });

      const res = await fetch(apiUrl("/historical/outreach-draft"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lead_name: lead.name,
          source: lead.source,
          sales_unit: lead.sales_unit || "Sales Unit",
          priority: lead.priority,
          predicted_label: lead.predicted_label,
          lead_category: lead.lead_category,
          lead_score: lead.lead_score,
          confidence_level: lead.confidence_level,
          primary_driver: lead.primary_driver,
          positive_evidence: lead.positive_evidence ?? [],
          negative_evidence: lead.negative_evidence ?? [],
          lock_strategy: lead.lock_strategy,
        }),
      });

      if (!res.ok) {
        throw new Error(`Outreach request failed with status: ${res.status}`);
      }

      const data = await res.json();
      if (data && typeof data.draft === "string") {
        setOutreachDraft({ status: "ready", draft: data.draft });
      } else {
        throw new Error("Invalid draft format received");
      }
    } catch (err) {
      setOutreachDraft({
        status: "error",
        error: err instanceof Error ? err.message : "Generation failed",
      });
    }
  };

  const mapScoredLeadToLeadItem = (lead: ScoredLead): LeadItem => ({
    object_id: lead.lead_id,
    lead_id: lead.lead_id,
    name: lead.contact_name || lead.lead_id,
    account_name: lead.company || "Scored account",
    contact_name: lead.contact_name || "",
    job_title: lead.job_title || "",
    email: lead.email || "",
    status: lead.lead_quality || lead.lead_category,
    source: lead.lead_source || lead.lead_origin || "Intelligence pipeline",
    priority: lead.lead_category === "Hot" ? "High" : lead.lead_category === "Warm" ? "Normal" : "Low",
    start_date: "",
    end_date: "",
    sales_unit: "",
    sales_territory: lead.country || "",
    owner_name: "",
    note: lead.primary_driver || "",
    features: {},
    predicted_label: lead.lead_category === "Hot" ? 1 : lead.lead_category === "Warm" ? 2 : 0,
    predicted_class: lead.lead_category,
    conversion_probability: lead.predicted_probability,
    confidence: lead.confidence_level === "Very High" ? 1 : lead.confidence_level === "High" ? 0.8 : lead.confidence_level === "Moderate" ? 0.6 : 0.35,
    lead_score: lead.lead_score,
    lead_category: lead.lead_category,
    confidence_level: lead.confidence_level,
    primary_driver: lead.primary_driver,
    positive_evidence: lead.positive_evidence,
    negative_evidence: lead.negative_evidence,
    lock_strategy: lead.lock_strategy,
    total_visits: lead.total_visits,
    total_time_on_website: lead.total_time_on_website,
    page_views_per_visit: lead.page_views_per_visit,
  });

  const handleInjectedPipelineResult = (result: InjectedPipelineResponse, rawInput: string) => {
    setUploadedRawInput(rawInput);
    setUploadedScoredLeads(result.leads);
    setUploadedCleaningReport(result.cleaning_report);
    setUploadedSummary(result.summary);
    setUploadedExecutionMs(result.pipeline_execution_time_ms);

    const mappedLeads: LeadItem[] = result.leads.map(mapScoredLeadToLeadItem);
    setLeads(mappedLeads);
    setIntelligenceLeads(mappedLeads);
    setSelectedLead(null);
    setOutreachDraft({ status: "idle" });
    setError(null);
  };

  const handleScoredLeadsChange = (scoredLeads: ScoredLead[]) => {
    const mappedLeads = scoredLeads.map(mapScoredLeadToLeadItem);
    setLeads(mappedLeads);
    setIntelligenceLeads(mappedLeads);
    setUploadedScoredLeads(scoredLeads);
  };

  const handleInputFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const raw = String(reader.result ?? "").trim();
        if (!raw) throw new Error("The selected file is empty");

        const payload = raw.startsWith("[") || raw.startsWith("{")
          ? { leads: Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [JSON.parse(raw)] }
          : { csv_text: raw };
        const response = await fetch(apiUrl("/conversion/inject-pipeline"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.detail || `File scoring failed (${response.status})`);
        }

        const result = body as InjectedPipelineResponse;
        handleInjectedPipelineResult(result, raw);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to score uploaded file");
      }
    };
    reader.onerror = () => setError("Could not read the selected file");
    reader.readAsText(file);
  };

  // When selected lead changes, reset outreach draft
  const handleSelectLead = (lead: LeadItem) => {
    setSelectedLead(lead);
    setOutreachDraft({ status: "idle" });
  };

  const handleNavigate = (href: string) => {
    const target = href.replace("#", "");
    if (!["analytics", "leads", "intelligence", "outreach"].includes(target)) {
      return;
    }
    // Always dismiss inspect drawer when navigating to another tab
    setSelectedLead(null);
    setCurrentTab(target);
    window.history.replaceState(null, "", window.location.pathname);
    if (target === "analytics") {
      document.getElementById("analytics")?.scrollIntoView({ behavior: "smooth" });
    } else if (target === "leads") {
      document.getElementById("leads")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="dashboard-app flex h-screen bg-white font-sans text-black overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="min-h-20 px-6 py-3 bg-white border-b border-black/10 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-bold text-black tracking-tight">
              HackSphere
            </h1>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-black text-white">
              <Sparkles className="h-3 w-3" />
              XGBoost
            </span>
          </div>

          <PillNav
            logo={<span className="text-indigo-600">✦</span>}
            logoAlt="HackSphere navigation"
            items={[
              { label: "Analytics", href: "#analytics" },
              { label: "Leads", href: "#leads" },
              { label: "Intelligence", href: "#intelligence" },
              { label: "Outreach", href: "#outreach" },
            ]}
            activeHref={`#${currentTab}`}
            className="flex"
            ease="power2.easeOut"
            baseColor="#0f172a"
            pillColor="#f8fafc"
            hoveredPillTextColor="#ffffff"
            pillTextColor="#334155"
            theme="light"
            initialLoadAnimation
            onNavigate={handleNavigate}
          />

          <div className="flex items-center gap-3">
            <input ref={inputFileRef} type="file" accept=".csv,.json,text/csv,application/json" onChange={handleInputFile} className="hidden" />
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => inputFileRef.current?.click()}
              className="text-xs h-9 border-black/20 hover:bg-black hover:text-white text-black"
            >
              Input CSV / JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLeads}
              disabled={loading}
              className="text-xs h-9 border-black/20 hover:bg-black hover:text-white text-black"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin text-indigo-600" : "text-slate-500"}`} />
              Refresh Data
            </Button>
            
            <Button
              variant="default"
              size="sm"
              className="text-xs h-9 bg-black hover:bg-black/80 text-white shadow-sm"
              onClick={() => {
                if (leads.length > 0) {
                  const json = JSON.stringify(leads, null, 2);
                  const blob = new Blob([json], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "crm-scored-leads.json";
                  a.click();
                }
              }}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export Scored Queue
            </Button>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <main ref={mainScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 pb-36 space-y-6">
            {/* Error banner if any */}
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
                <Button variant="outline" size="sm" onClick={fetchLeads} className="h-7 text-xs bg-white">
                  Retry
                </Button>
              </div>
            )}

            {currentTab === "outreach" ? (
              <OutreachPage
                leads={intelligenceLeads.length > 0 ? intelligenceLeads : leads}
                selectedLead={outreachLead}
                outreachDraft={outreachDraft}
                onSelectLead={(lead) => {
                  setOutreachLead(lead);
                  setOutreachDraft({ status: "idle" });
                }}
                onGenerateOutreach={handleGenerateOutreach}
              />
            ) : currentTab === "intelligence" ? (
              <section id="intelligence">
                <ConversionPanel
                  onScoredLeadsChange={handleScoredLeadsChange}
                  onInjectedPipelineResult={handleInjectedPipelineResult}
                  onInspectLead={handleSelectLead}
                  sharedScoredLeads={uploadedScoredLeads}
                  sharedRawInput={uploadedRawInput}
                  sharedCleaningReport={uploadedCleaningReport}
                  sharedSummary={uploadedSummary}
                  sharedExecutionMs={uploadedExecutionMs}
                />
              </section>
            ) : (
              <>
                <section id="analytics">
                  <KPIStats leads={leads} metrics={modelMetrics} />
                </section>
                <section id="leads" className="w-full">
                  <ContainerScroll
                    scrollContainerRef={mainScrollRef}
                    titleComponent={
                      <div className="flex flex-col items-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2 shadow-xs">
                          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                          Live ML Scored Pipeline
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
                          Prioritized CRM Lead Queue
                        </h2>
                        <p className="text-sm text-slate-500 mt-1 max-w-lg mx-auto">
                          Interactive 3D conversion intelligence matrix powered by calibrated XGBoost scoring.
                        </p>
                      </div>
                    }
                  >
                    <LeadsTable
                      leads={leads}
                      selectedLead={selectedLead}
                      onSelectLead={handleSelectLead}
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      statusFilter={statusFilter}
                      onStatusFilterChange={setStatusFilter}
                      priorityFilter={priorityFilter}
                      onPriorityFilterChange={setPriorityFilter}
                      sortBy={sortBy}
                      onSortByChange={setSortBy}
                      onApplyFilters={(filters) => {
                        setSearchQuery(filters.searchQuery);
                        setStatusFilter(filters.statusFilter);
                        setPriorityFilter(filters.priorityFilter);
                        setSortBy(filters.sortBy);
                      }}
                    />
                  </ContainerScroll>
                </section>
              </>
            )}
          </main>

          {/* Slide-over Target Inspection & Intelligence Drawer */}
          {selectedLead && currentTab !== "outreach" && (
            <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
              {/* Semi-transparent backdrop to focus on drawer */}
              <div
                className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                onClick={() => setSelectedLead(null)}
              />

              {/* Smooth Full-Height Slide-over Panel */}
              <div className="relative w-full sm:w-[520px] md:w-[580px] lg:w-[620px] h-full bg-white shadow-2xl flex flex-col z-10 border-l border-slate-200 animate-in slide-in-from-right duration-300">
                <LeadDetails
                  lead={selectedLead}
                  onClose={() => setSelectedLead(null)}
                  outreachDraft={outreachDraft}
                  onGenerateOutreach={handleGenerateOutreach}
                  className="rounded-none border-0 h-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default App;
