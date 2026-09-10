import React, { useEffect, useState, useCallback } from "react";
import { PillNav } from "@/components/layout/PillNav";
import { KPIStats } from "@/components/dashboard/KPIStats";
import { LeadsTable } from "@/components/dashboard/LeadsTable";
import { LeadDetails } from "@/components/dashboard/LeadDetails";
import { OutreachPage } from "@/components/dashboard/OutreachPage";
import { LeadItem, ModelMetrics, OutreachDraftState, LeadListResponse } from "@/types/crm";
import {
  Sparkles,
  Download,
  RefreshCw,
  AlertCircle,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function App() {
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);

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

      const res = await fetch(`/historical/leads?${params.toString()}`);
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
    // Keep browser refreshes on the dashboard instead of restoring an old nav hash.
    window.history.replaceState(null, "", window.location.pathname);
    setCurrentTab("dashboard");
  }, []);

  useEffect(() => {
    fetch("/historical/model-metrics")
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

      const res = await fetch("/historical/outreach-draft", {
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

  // When selected lead changes, reset outreach draft
  const handleSelectLead = (lead: LeadItem) => {
    setSelectedLead(lead);
    setOutreachDraft({ status: "idle" });
  };

  const handleNavigate = (href: string) => {
    const target = href.replace("#", "");
    if (!["dashboard", "analytics", "leads", "outreach"].includes(target)) {
      return;
    }
    setCurrentTab(target);
    window.history.replaceState(null, "", window.location.pathname);
    const scrollTarget = target === "analytics" ? "dashboard" : target;
    document.getElementById(scrollTarget)?.scrollIntoView({ behavior: "smooth" });
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
              { label: "Home", href: "#dashboard" },
              { label: "Analytics", href: "#analytics" },
              { label: "Leads", href: "#leads" },
              { label: "Outreach", href: "#outreach" },
            ]}
            activeHref={`#${currentTab === "dashboard" ? "dashboard" : currentTab}`}
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
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => undefined}
              className="text-xs h-9 border-black/20 hover:bg-black hover:text-white text-black"
            >
              Input
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
          <main className="flex-1 overflow-y-auto p-6 space-y-6">
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
                leads={leads}
                selectedLead={selectedLead}
                outreachDraft={outreachDraft}
                onSelectLead={handleSelectLead}
                onGenerateOutreach={handleGenerateOutreach}
              />
            ) : (
              <>
                <section id="dashboard">
                  <KPIStats leads={leads} metrics={modelMetrics} />
                </section>
                <section id="leads">
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
                </section>
              </>
            )}
          </main>

          {/* Slide-out Intelligence & Outreach Drawer */}
          {selectedLead && currentTab !== "outreach" && (
            <section id="outreach" className="w-full lg:w-[480px] shrink-0">
            <LeadDetails
              lead={selectedLead}
              onClose={() => setSelectedLead(null)}
              outreachDraft={outreachDraft}
              onGenerateOutreach={handleGenerateOutreach}
            />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
export default App;
