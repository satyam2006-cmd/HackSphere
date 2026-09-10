import React, { useEffect, useState, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { KPIStats } from "@/components/dashboard/KPIStats";
import { LeadsTable } from "@/components/dashboard/LeadsTable";
import { LeadDetails } from "@/components/dashboard/LeadDetails";
import { LeadItem, OutreachDraftState, LeadListResponse } from "@/types/crm";
import {
  Sparkles,
  Download,
  Plus,
  RefreshCw,
  Bell,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function App() {
  const [currentTab, setCurrentTab] = useState("leads");
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);

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

      // Default select the top ranked lead if none selected
      if (!selectedLead && data.leads.length > 0) {
        setSelectedLead(data.leads[0]);
      } else if (selectedLead) {
        // Keep selected lead updated
        const updated = data.leads.find((l) => l.object_id === selectedLead.object_id);
        if (updated) setSelectedLead(updated);
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

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
      {/* Syncrowave Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        leadCount={leads.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 px-6 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Lead Intelligence & Outreach Portal
            </h1>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="h-3 w-3 text-indigo-600" />
              XGBoost Model v1.0
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLeads}
              disabled={loading}
              className="text-xs h-9 border-slate-200 hover:bg-slate-50 text-slate-700"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin text-indigo-600" : "text-slate-500"}`} />
              Refresh Data
            </Button>
            
            <Button
              variant="default"
              size="sm"
              className="text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
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
            {/* KPI Cards */}
            <KPIStats leads={leads} />

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

            {/* Leads Table */}
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
            />
          </main>

          {/* Slide-out Intelligence & Outreach Drawer */}
          {selectedLead && (
            <LeadDetails
              lead={selectedLead}
              onClose={() => setSelectedLead(null)}
              outreachDraft={outreachDraft}
              onGenerateOutreach={handleGenerateOutreach}
            />
          )}
        </div>
      </div>
    </div>
  );
}
export default App;
