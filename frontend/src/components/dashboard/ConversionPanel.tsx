import React, { useEffect, useState, useRef } from "react";
import { apiUrl } from "@/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ScoredLead,
  PipelineDemoResponse,
  PipelineDemoSummary,
  CleaningReport,
  InjectedPipelineResponse,
  ConversionMetrics,
  LeadItem,
} from "@/types/crm";
import {
  Flame,
  TrendingUp,
  Snowflake,
  Target,
  BarChart3,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Zap,
  Building2,
  Sparkles,
  Upload,
  FileText,
  Download,
  Check,
  Cpu,
  Search,
  Eye,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  Briefcase,
  Award,
  Globe,
  MapPin,
  Mail,
  Activity,
  Filter,
} from "lucide-react";

export interface ConversionPanelProps {
  className?: string;
  onScoredLeadsChange?: (leads: ScoredLead[]) => void;
  onInjectedPipelineResult?: (result: InjectedPipelineResponse, rawInput: string) => void;
  onInspectLead?: (lead: LeadItem) => void;
  sharedScoredLeads?: ScoredLead[];
  sharedRawInput?: string;
  sharedCleaningReport?: CleaningReport | null;
  sharedSummary?: PipelineDemoSummary | null;
  sharedExecutionMs?: number | null;
}

export const mapScoredLeadToLeadItem = (lead: ScoredLead): LeadItem => ({
  object_id: lead.lead_id,
  lead_id: lead.lead_id,
  name: lead.contact_name || lead.lead_id,
  account_name: lead.company || "Scored account",
  contact_name: lead.contact_name || "",
  job_title: lead.job_title || "",
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

const categoryBadges: Record<
  string,
  {
    badge: string;
    icon: React.ReactNode;
    barColor: string;
  }
> = {
  Hot: {
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    icon: <Flame className="h-3.5 w-3.5 text-rose-600" />,
    barColor: "bg-rose-600",
  },
  Warm: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <TrendingUp className="h-3.5 w-3.5 text-amber-600" />,
    barColor: "bg-amber-500",
  },
  Cold: {
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    icon: <Snowflake className="h-3.5 w-3.5 text-sky-600" />,
    barColor: "bg-sky-500",
  },
};

const confidenceBadges: Record<string, string> = {
  "Very High": "bg-emerald-50 text-emerald-700 border-emerald-200",
  High: "bg-teal-50 text-teal-700 border-teal-200",
  Moderate: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-slate-100 text-slate-600 border-slate-200",
};

function averageLockChance(leads: ScoredLead[], category: ScoredLead["lead_category"]): number {
  const matching = leads.filter((lead) => lead.lead_category === category);
  if (matching.length === 0) return 0;
  return matching.reduce((sum, lead) => sum + lead.lock_chance_pct, 0) / matching.length;
}

export function formatPercent(val: number | string | undefined | null, maxDecimals = 3): string {
  if (val === undefined || val === null || val === "") return "0%";
  const num = typeof val === "number" ? val : parseFloat(String(val));
  if (isNaN(num)) return "0%";
  const rounded = Number(num.toFixed(maxDecimals));
  return `${rounded}%`;
}

export function ConversionPanel({
  className = "",
  onScoredLeadsChange,
  onInjectedPipelineResult,
  onInspectLead,
  sharedScoredLeads = [],
  sharedRawInput = "",
  sharedCleaningReport = null,
  sharedSummary = null,
  sharedExecutionMs = null,
}: ConversionPanelProps) {
  // Modes: "verification20" | "inject" | "full"
  const [dataSource, setDataSource] = useState<"verification20" | "inject" | "full">("verification20");
  const [leads, setLeads] = useState<ScoredLead[]>([]);
  const [metrics, setMetrics] = useState<ConversionMetrics | null>(null);
  const [demoSummary, setDemoSummary] = useState<PipelineDemoSummary | null>(null);
  const [cleaningReport, setCleaningReport] = useState<CleaningReport | null>(null);

  const [categoryCounts, setCategoryCounts] = useState<{ all: number; hot: number; warm: number; cold: number }>({
    all: 20,
    hot: 7,
    warm: 6,
    cold: 7,
  });

  const [loading, setLoading] = useState(true);
  const [benchmarking, setBenchmarking] = useState(false);
  const [lastExecutionMs, setLastExecutionMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  // Pagination state for the intelligence table
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Injection Studio State
  const [rawInputText, setRawInputText] = useState<string>("");
  const [injecting, setInjecting] = useState<boolean>(false);
  const [showCleaningDetails, setShowCleaningDetails] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize state when shared props update
  useEffect(() => {
    if (sharedScoredLeads.length === 0) return;
    setDataSource("inject");
    setLeads(sharedScoredLeads);
    setRawInputText(sharedRawInput);
    if (sharedCleaningReport) {
      setCleaningReport(sharedCleaningReport);
    }
    if (sharedExecutionMs !== null && sharedExecutionMs !== undefined) {
      setLastExecutionMs(sharedExecutionMs);
    }
    if (sharedSummary) {
      setDemoSummary(sharedSummary);
      setCategoryCounts({
        all: sharedSummary.total,
        hot: sharedSummary.hot_count,
        warm: sharedSummary.warm_count,
        cold: sharedSummary.cold_count,
      });
    } else {
      setDemoSummary({
        total: sharedScoredLeads.length,
        hot_count: sharedScoredLeads.filter((lead) => lead.lead_category === "Hot").length,
        warm_count: sharedScoredLeads.filter((lead) => lead.lead_category === "Warm").length,
        cold_count: sharedScoredLeads.filter((lead) => lead.lead_category === "Cold").length,
        hot_avg_lock_chance: averageLockChance(sharedScoredLeads, "Hot"),
        warm_avg_lock_chance: averageLockChance(sharedScoredLeads, "Warm"),
        cold_avg_lock_chance: averageLockChance(sharedScoredLeads, "Cold"),
      });
      setCategoryCounts({
        all: sharedScoredLeads.length,
        hot: sharedScoredLeads.filter((lead) => lead.lead_category === "Hot").length,
        warm: sharedScoredLeads.filter((lead) => lead.lead_category === "Warm").length,
        cold: sharedScoredLeads.filter((lead) => lead.lead_category === "Cold").length,
      });
    }
    setLoading(false);
  }, [sharedRawInput, sharedScoredLeads, sharedCleaningReport, sharedSummary, sharedExecutionMs]);

  const fetchVerification20 = async () => {
    try {
      setLoading(true);
      setError(null);
      const [demoRes, metricsRes] = await Promise.all([
        fetch(apiUrl("/conversion/demo-pipeline-20")),
        fetch(apiUrl("/conversion/metrics")),
      ]);

      if (!demoRes.ok) throw new Error(`Verification dataset error: ${demoRes.status}`);
      if (!metricsRes.ok) throw new Error(`Metrics error: ${metricsRes.status}`);

      const demoData: PipelineDemoResponse = await demoRes.json();
      const metricsData: ConversionMetrics = await metricsRes.json();

      setLeads(demoData.leads);
      onScoredLeadsChange?.(demoData.leads);
      setDemoSummary(demoData.summary);
      setCategoryCounts({
        all: demoData.summary.total,
        hot: demoData.summary.hot_count,
        warm: demoData.summary.warm_count,
        cold: demoData.summary.cold_count,
      });
      setLastExecutionMs(demoData.pipeline_execution_time_ms);
      setMetrics(metricsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load verification pipeline data");
    } finally {
      setLoading(false);
    }
  };

  const fetchFullScoredLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (category !== "all") params.append("category", category);
      params.append("limit", "100");
      params.append("sort_by", "Lead_Score");
      params.append("order", "desc");

      const [leadsRes, metricsRes] = await Promise.all([
        fetch(apiUrl(`/conversion/scored-leads?${params.toString()}`)),
        fetch(apiUrl("/conversion/metrics")),
      ]);

      if (!leadsRes.ok) throw new Error(`Full leads query error: ${leadsRes.status}`);
      if (!metricsRes.ok) throw new Error(`Metrics error: ${metricsRes.status}`);

      const leadsData = await leadsRes.json();
      const metricsData: ConversionMetrics = await metricsRes.json();

      setLeads(leadsData.leads);
      onScoredLeadsChange?.(leadsData.leads);
      if (leadsData.category_counts) {
        setCategoryCounts(leadsData.category_counts);
      }
      setMetrics(metricsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load full CRM leads");
    } finally {
      setLoading(false);
    }
  };

  const runLiveVerificationPipeline = async () => {
    try {
      setBenchmarking(true);
      setError(null);
      const res = await fetch(apiUrl("/conversion/demo-pipeline-20?run_live=true"));
      if (!res.ok) throw new Error(`Live benchmark failed: ${res.status}`);
      const data: PipelineDemoResponse = await res.json();
      setLeads(data.leads);
      onScoredLeadsChange?.(data.leads);
      setDemoSummary(data.summary);
      setCategoryCounts({
        all: data.summary.total,
        hot: data.summary.hot_count,
        warm: data.summary.warm_count,
        cold: data.summary.cold_count,
      });
      setLastExecutionMs(data.pipeline_execution_time_ms);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Live pipeline benchmark failed");
    } finally {
      setBenchmarking(false);
    }
  };

  const loadSampleRawDataset = async () => {
    try {
      setLoading(true);
      const res = await fetch(apiUrl("/conversion/sample-injection-dataset"));
      if (!res.ok) throw new Error("Failed to load sample raw dataset");
      const sample = await res.json();
      setRawInputText(JSON.stringify(sample, null, 2));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sample dataset");
    } finally {
      setLoading(false);
    }
  };

  const executeInjectedPipeline = async (overrideRaw?: unknown) => {
    try {
      setInjecting(true);
      setError(null);

      const textToUse = typeof overrideRaw === "string" ? overrideRaw : rawInputText;
      let payload: { leads?: object[]; csv_text?: string } = {};

      const trimmed = textToUse.trim();
      if (!trimmed) {
        payload = {};
      } else if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        try {
          const parsed = JSON.parse(trimmed);
          payload = { leads: Array.isArray(parsed) ? parsed : [parsed] };
        } catch {
          payload = { csv_text: trimmed };
        }
      } else {
        payload = { csv_text: trimmed };
      }

      const res = await fetch(apiUrl("/conversion/inject-pipeline"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Pipeline execution failed (${res.status})`);
      }

      const data: InjectedPipelineResponse = await res.json();
      setLeads(data.leads);
      onScoredLeadsChange?.(data.leads);
      onInjectedPipelineResult?.(data, textToUse);
      setDemoSummary(data.summary);
      setCleaningReport(data.cleaning_report);
      setCategoryCounts({
        all: data.summary.total,
        hot: data.summary.hot_count,
        warm: data.summary.warm_count,
        cold: data.summary.cold_count,
      });
      setLastExecutionMs(data.pipeline_execution_time_ms);
      setCategory("all");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Injected pipeline execution failed");
    } finally {
      setInjecting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result ?? "");
      setRawInputText(content);
      executeInjectedPipeline(content);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  useEffect(() => {
    if (sharedScoredLeads.length > 0) return;
    if (dataSource === "verification20") {
      fetchVerification20();
    } else if (dataSource === "full") {
      fetchFullScoredLeads();
    } else if (dataSource === "inject") {
      if (!rawInputText) {
        loadSampleRawDataset();
      }
    }
  }, [dataSource, category, sharedScoredLeads.length]);

  const downloadResults = (format: "csv" | "json") => {
    if (leads.length === 0) return;
    let dataStr = "";
    let mimeType = "";
    const fileName = `cleaned_scored_leads.${format}`;

    if (format === "json") {
      dataStr = JSON.stringify({ cleaning_report: cleaningReport, summary: demoSummary, leads }, null, 2);
      mimeType = "application/json";
    } else {
      const headers = [
        "sales_rank",
        "lead_id",
        "contact_name",
        "company",
        "job_title",
        "lead_score",
        "lead_category",
        "lock_chance_pct",
        "confidence_level",
        "primary_driver",
        "lead_origin",
        "lead_source",
        "total_time_on_website",
        "total_visits",
        "lock_strategy",
      ];
      const rows = leads.map((l) => [
        l.sales_rank,
        `"${l.lead_id}"`,
        `"${l.contact_name || ""}"`,
        `"${l.company || ""}"`,
        `"${l.job_title || ""}"`,
        l.lead_score,
        l.lead_category,
        Number(Number(l.lock_chance_pct || 0).toFixed(3)),
        l.confidence_level,
        `"${(l.primary_driver || "").replace(/"/g, '""')}"`,
        `"${l.lead_origin || ""}"`,
        `"${l.lead_source || ""}"`,
        l.total_time_on_website,
        l.total_visits,
        `"${(l.lock_strategy || "").replace(/"/g, '""')}"`,
      ]);
      dataStr = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      mimeType = "text/csv";
    }

    const blob = new Blob([dataStr], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter leads based on Category & Search Query
  const filteredLeads = leads.filter((l) => {
    const matchesCategory =
      category === "all" || l.lead_category.toLowerCase() === category.toLowerCase();
    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.lead_id.toLowerCase().includes(q) ||
      (l.contact_name || "").toLowerCase().includes(q) ||
      (l.company || "").toLowerCase().includes(q) ||
      (l.primary_driver || "").toLowerCase().includes(q) ||
      (l.lead_origin || "").toLowerCase().includes(q) ||
      (l.lead_source || "").toLowerCase().includes(q) ||
      (l.lock_strategy || "").toLowerCase().includes(q) ||
      (l.tags || "").toLowerCase().includes(q)
    );
  });

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [category, searchQuery, leads.length]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const displayedLeads = filteredLeads.slice(startIndex, startIndex + pageSize);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. TOP PIPELINE OVERVIEW: Clean Rectangular Black-Border Card */}
      <div className="bg-white rounded-2xl border-2 border-black p-5 sm:p-6 shadow-none">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-black text-white">
                <Sparkles className="h-3.5 w-3.5" />
                Pipeline Engine
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Live XGBoost Active
              </span>
              {lastExecutionMs !== null && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Latency: {lastExecutionMs}ms
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 pt-1">
              End-to-End Conversion Intelligence Matrix
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Automated missing data imputation, 158-dimension categorical encoding, and calibrated conversion likelihood with TreeSHAP decision factors.
            </p>
          </div>

          {metrics && (
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <div className="p-2.5 rounded-xl border-2 border-black bg-slate-50 text-center min-w-[90px]">
                <p className="text-[10px] uppercase font-bold text-slate-500">ROC-AUC</p>
                <p className="text-sm font-black text-black">{(metrics.roc_auc_score * 100).toFixed(1)}%</p>
              </div>
              <div className="p-2.5 rounded-xl border-2 border-black bg-slate-50 text-center min-w-[90px]">
                <p className="text-[10px] uppercase font-bold text-slate-500">F1-Score</p>
                <p className="text-sm font-black text-black">{(metrics.f1_score * 100).toFixed(1)}%</p>
              </div>
              <div className="p-2.5 rounded-xl border-2 border-black bg-slate-50 text-center min-w-[90px]">
                <p className="text-[10px] uppercase font-bold text-slate-500">Optimal Cut</p>
                <p className="text-sm font-black text-black">{(metrics.threshold * 100).toFixed(0)}%</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. THREE-TIER CONVERSION KPI CARDS (Alternating Solid & Dashed 2px Black Borders) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hot Leads Card */}
        <div className="bg-white rounded-2xl border-2 border-black border-solid p-5 shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200">
                  <Flame className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Hot Tier</h3>
                  <p className="text-[11px] text-slate-500">&ge; 80% Conversion Score</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                {categoryCounts.hot} leads
              </span>
            </div>

            <div className="space-y-1 mt-4">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Average Lock Chance</p>
              <p className="text-3xl font-black text-slate-900">
                {demoSummary ? `${demoSummary.hot_avg_lock_chance.toFixed(1)}%` : "80 - 99%"}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />
              Primary Play: Immediate executive demo &amp; quote
            </p>
            <p className="text-[11px] text-slate-500 leading-snug">
              Key Signals: High web time (&gt;800s), Add Form origin, high-intent inquiries.
            </p>
          </div>
        </div>

        {/* Warm Leads Card (Dashed Border) */}
        <div className="bg-white rounded-2xl border-2 border-black border-dashed p-5 shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Warm Tier</h3>
                  <p className="text-[11px] text-slate-500">40 - 79% Conversion Score</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                {categoryCounts.warm} leads
              </span>
            </div>

            <div className="space-y-1 mt-4">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Average Lock Chance</p>
              <p className="text-3xl font-black text-slate-900">
                {demoSummary ? `${demoSummary.warm_avg_lock_chance.toFixed(1)}%` : "40 - 79%"}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5 text-amber-600" />
              Primary Play: Technical value asset &amp; case studies
            </p>
            <p className="text-[11px] text-slate-500 leading-snug">
              Key Signals: Moderate engagement, email opened, active evaluation in progress.
            </p>
          </div>
        </div>

        {/* Cold Leads Card (Solid Border) */}
        <div className="bg-white rounded-2xl border-2 border-black border-solid p-5 shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-50 border border-sky-200">
                  <Snowflake className="h-5 w-5 text-sky-600" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Cold Tier</h3>
                  <p className="text-[11px] text-slate-500">&lt; 40% Conversion Score</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                {categoryCounts.cold} leads
              </span>
            </div>

            <div className="space-y-1 mt-4">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Average Lock Chance</p>
              <p className="text-3xl font-black text-slate-900">
                {demoSummary ? `${demoSummary.cold_avg_lock_chance.toFixed(1)}%` : "2 - 39%"}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
              <ArrowUpRight className="h-3.5 w-3.5 text-sky-600" />
              Primary Play: Low-touch automated nurturing sequence
            </p>
            <p className="text-[11px] text-slate-500 leading-snug">
              Key Signals: Minimal site time (&lt;100s), friction tags, passive channel origin.
            </p>
          </div>
        </div>
      </div>

      {/* 3. DATASET PIPELINE INGESTION CONSOLE */}
      <div className="bg-white rounded-2xl border-2 border-black p-5 sm:p-6 shadow-none space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1">Pipeline Mode:</span>
            <button
              onClick={() => setDataSource("verification20")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                dataSource === "verification20"
                  ? "bg-black text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              20-Lead Live Verification
            </button>
            <button
              onClick={() => setDataSource("inject")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                dataSource === "inject"
                  ? "bg-black text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              Inject &amp; Clean Custom Dataset
            </button>
            <button
              onClick={() => setDataSource("full")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                dataSource === "full"
                  ? "bg-black text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Full Database (1,848 Leads)
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {dataSource === "verification20" && (
              <Button
                size="sm"
                onClick={runLiveVerificationPipeline}
                disabled={benchmarking}
                className="bg-black hover:bg-black/85 text-white text-xs h-8 px-3 rounded-lg flex items-center gap-1.5 shadow-xs"
              >
                {benchmarking ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                {benchmarking ? "Scoring 20 Leads Live…" : "Re-run Live Pipeline"}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={
                dataSource === "verification20"
                  ? fetchVerification20
                  : dataSource === "inject"
                  ? executeInjectedPipeline
                  : fetchFullScoredLeads
              }
              disabled={loading || injecting}
              className="text-xs h-8 border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-lg"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading || injecting ? "animate-spin text-black" : ""}`} />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Injected dataset controls */}
        {dataSource === "inject" && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-700">
                Raw Input (CSV format or JSON array):
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.json,text/csv,application/json"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs h-8 border-slate-200 bg-white hover:bg-black hover:text-white text-slate-800 flex items-center gap-1.5 rounded-lg"
                >
                  <Upload className="h-3.5 w-3.5" /> Upload File (.csv / .json)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadSampleRawDataset}
                  disabled={loading}
                  className="text-xs h-8 border-slate-200 bg-white hover:bg-black hover:text-white text-slate-800 flex items-center gap-1.5 rounded-lg"
                >
                  <FileText className="h-3.5 w-3.5" /> Load 25-Lead Raw Sample
                </Button>
              </div>
            </div>

            <textarea
              value={rawInputText}
              onChange={(e) => setRawInputText(e.target.value)}
              placeholder="Paste raw CSV text or JSON leads array here, or upload a CSV file above..."
              rows={5}
              className="w-full font-mono text-xs p-3 rounded-xl border-2 border-black/20 focus:border-black bg-slate-50/50 shadow-inner focus:outline-none text-slate-800 transition-colors"
            />

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Automatic preprocessing includes SimpleImputer + 158-dimension OneHot encoder</span>
              </div>

              <Button
                size="default"
                onClick={executeInjectedPipeline}
                disabled={injecting}
                className="bg-black hover:bg-black/85 text-white font-bold text-xs h-9 px-5 rounded-xl shadow-xs flex items-center gap-2"
              >
                {injecting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {injecting ? "Cleaning Data & Scoring Pipeline…" : "Clean Data & Run Entire Pipeline"}
              </Button>
            </div>

            {/* Cleaning Report Banner */}
            {cleaningReport && (
              <div className="mt-3 p-4 rounded-xl border-2 border-black bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Data Cleaning &amp; Pipeline Execution Complete ({lastExecutionMs}ms)</span>
                  </div>
                  <button
                    onClick={() => setShowCleaningDetails(!showCleaningDetails)}
                    className="text-xs text-slate-700 hover:text-black font-semibold underline flex items-center gap-1"
                  >
                    {showCleaningDetails ? "Hide Steps" : "View Steps"}
                    {showCleaningDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-700 flex-wrap">
                  <span>✓ <strong>{cleaningReport.total_records}</strong> records cleaned</span>
                  <span>✓ <strong>{cleaningReport.missing_values_imputed}</strong> missing values imputed</span>
                  <span>✓ <strong>{cleaningReport.fields_normalized}</strong> alias keys standardized</span>
                  <span>✓ <strong>158</strong> features scaled &amp; encoded</span>
                </div>

                {showCleaningDetails && (
                  <ul className="mt-2 pt-2 border-t border-slate-200 space-y-1 text-xs text-slate-800">
                    {cleaningReport.cleaning_steps.map((step, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Check className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error notification if any */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* 4. THE SCORED LEADS TABLE: Styled Exactly Like LeadsTable (Rectangular & Bigger) */}
      <div className="bg-white rounded-2xl border-2 border-black shadow-none overflow-hidden flex flex-col w-full">
        {/* Table Toolbar / Search & Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by ID, name, company, origin, primary driver..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-slate-200 text-sm focus-visible:ring-black"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { id: "all", label: "All", count: categoryCounts.all },
                { id: "Hot", label: "Hot", count: categoryCounts.hot },
                { id: "Warm", label: "Warm", count: categoryCounts.warm },
                { id: "Cold", label: "Cold", count: categoryCounts.cold },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCategory(item.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    category === item.id
                      ? "bg-white text-black shadow-xs"
                      : "text-slate-500 hover:text-black"
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      category === item.id ? "bg-slate-100 text-black" : "bg-transparent text-slate-400"
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Export buttons */}
            {leads.length > 0 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadResults("csv")}
                  className="h-9 px-3 text-xs border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-lg flex items-center gap-1"
                >
                  <Download className="h-3.5 w-3.5" /> CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadResults("json")}
                  className="h-9 px-3 text-xs border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-lg flex items-center gap-1"
                >
                  <Download className="h-3.5 w-3.5" /> JSON
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto flex-1 overflow-y-auto">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[260px] text-xs font-semibold text-slate-600">Rank &amp; Contact</TableHead>
                <TableHead className="w-[110px] text-xs font-semibold text-slate-600">Tier</TableHead>
                <TableHead className="w-[180px] text-xs font-semibold text-slate-600">Lock Likelihood</TableHead>
                <TableHead className="w-[120px] text-xs font-semibold text-slate-600">Confidence</TableHead>
                <TableHead className="min-w-[220px] text-xs font-semibold text-slate-600">Decision Evidence (TreeSHAP)</TableHead>
                <TableHead className="min-w-[180px] text-xs font-semibold text-slate-600">Lock Strategy</TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-600">Inspection &amp; Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-black" />
                      <p className="font-semibold text-slate-700">Loading intelligence data...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : displayedLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-slate-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="font-semibold text-slate-700">No leads match your filter</p>
                      <p className="text-xs text-slate-500">Try adjusting your search query or reset your tier selection.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                displayedLeads.map((lead) => {
                  const badgeStyle = categoryBadges[lead.lead_category] || categoryBadges.Cold;
                  const confBadge = confidenceBadges[lead.confidence_level] || confidenceBadges.Moderate;
                  const isExpanded = expandedLead === lead.lead_id;
                  const rawLockPct = lead.lock_chance_pct ?? (lead.predicted_probability != null ? lead.predicted_probability * 100 : 0);
                  const lockPctDisplay = formatPercent(rawLockPct, 3);
                  const lockPctNum = typeof rawLockPct === "number" ? rawLockPct : parseFloat(String(rawLockPct)) || 0;

                  return (
                    <React.Fragment key={lead.lead_id}>
                      <TableRow
                        onClick={() => setExpandedLead(isExpanded ? null : lead.lead_id)}
                        className={`cursor-pointer transition-colors ${
                          isExpanded ? "bg-slate-50/90 border-l-4 border-l-black" : "hover:bg-slate-50/80"
                        }`}
                      >
                        {/* 1. Rank & Contact */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-800 shrink-0">
                              #{lead.sales_rank}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {lead.contact_name || lead.lead_id}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
                                <span className="flex items-center gap-1 truncate">
                                  <Building2 className="h-3 w-3 text-slate-400" />
                                  {lead.company || "Enterprise Lead"}
                                </span>
                                {lead.job_title && (
                                  <span className="truncate border-l border-slate-200 pl-2 text-[11px]">
                                    {lead.job_title}
                                  </span>
                                )}
                              </div>
                              {lead.email && (
                                <div className="flex items-center gap-1 text-[11px] text-indigo-600 font-medium truncate mt-0.5">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{lead.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* 2. Tier Badge */}
                        <TableCell className="py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${badgeStyle.badge}`}
                          >
                            {badgeStyle.icon}
                            {lead.lead_category}
                          </span>
                        </TableCell>

                        {/* 3. Lock Likelihood Bar */}
                        <TableCell className="py-3.5">
                          <div className="space-y-1.5 w-full">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-800">{lockPctDisplay}</span>
                              <span className="text-[10px] text-slate-400 font-medium">Score: {lead.lead_score}</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${badgeStyle.barColor}`}
                                style={{ width: `${Math.min(100, Math.max(3, lockPctNum))}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>

                        {/* 4. Confidence */}
                        <TableCell className="py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${confBadge}`}
                          >
                            {lead.confidence_level || "Moderate"}
                          </span>
                        </TableCell>

                        {/* 5. Decision Evidence / Driver */}
                        <TableCell className="py-3.5">
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200 max-w-full">
                              <Target className="h-3 w-3 text-black shrink-0" />
                              <span className="truncate max-w-[220px]">{lead.primary_driver || "Profile Baseline"}</span>
                            </div>
                            {lead.positive_evidence && lead.positive_evidence.length > 0 && (
                              <p className="text-[11px] text-emerald-700 truncate max-w-[240px]">
                                <span className="font-bold">+</span> {lead.positive_evidence[0]}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        {/* 6. Lock Strategy */}
                        <TableCell className="py-3.5">
                          <span className="text-xs text-slate-700 line-clamp-2 max-w-[200px]">
                            {lead.lock_strategy || "Standard engagement sequence"}
                          </span>
                        </TableCell>

                        {/* 7. Inspection & Details */}
                        <TableCell className="py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const mapped = mapScoredLeadToLeadItem(lead);
                                onInspectLead?.(mapped);
                              }}
                              className="h-7 px-2.5 text-xs font-semibold border-slate-200 bg-white hover:bg-black hover:text-white text-slate-800 transition-all shadow-xs flex items-center gap-1 rounded-md"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Inspect
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-black"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedLead(isExpanded ? null : lead.lead_id);
                              }}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expandable Attributes Drawer */}
                      {isExpanded && (
                        <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 border-b border-black/10">
                          <TableCell colSpan={7} className="px-6 py-4 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Positive Factors */}
                              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                                <p className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  Positive Supporting Evidence
                                </p>
                                {lead.positive_evidence && lead.positive_evidence.length > 0 ? (
                                  <ul className="space-y-1">
                                    {lead.positive_evidence.map((ev, i) => (
                                      <li
                                        key={i}
                                        className="text-xs text-emerald-800 flex items-center gap-1.5 bg-emerald-50/60 px-2.5 py-1 rounded-md border border-emerald-100"
                                      >
                                        <span className="font-bold text-emerald-600">+</span>
                                        <span>{ev}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-slate-400 italic">No strong positive drivers detected.</p>
                                )}
                              </div>

                              {/* Friction Signals */}
                              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5">
                                <p className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                                  Friction &amp; Risk Factors
                                </p>
                                {lead.negative_evidence && lead.negative_evidence.length > 0 ? (
                                  <ul className="space-y-1">
                                    {lead.negative_evidence.map((ev, i) => (
                                      <li
                                        key={i}
                                        className="text-xs text-rose-800 flex items-center gap-1.5 bg-rose-50/60 px-2.5 py-1 rounded-md border border-rose-100"
                                      >
                                        <span className="font-bold text-rose-600">-</span>
                                        <span>{ev}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-slate-400 italic">Low friction profile.</p>
                                )}
                              </div>
                            </div>

                            {/* Attribute Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs border-t border-slate-200">
                              <div className="flex items-center gap-2 text-slate-600">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-slate-400">Website Time:</span>
                                <span className="font-semibold text-slate-800">{Math.round(lead.total_time_on_website)}s</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-600">
                                <Eye className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-slate-400">Total Visits:</span>
                                <span className="font-semibold text-slate-800">{lead.total_visits}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-600">
                                <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-slate-400">Occupation:</span>
                                <span className="font-semibold text-slate-800">{lead.occupation || "N/A"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-600">
                                <Award className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-slate-400">Origin:</span>
                                <span className="font-semibold text-slate-800">{lead.lead_origin || "Direct"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-600">
                                <Globe className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-slate-400">Country:</span>
                                <span className="font-semibold text-slate-800">{lead.country || "N/A"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-600">
                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-slate-400">City:</span>
                                <span className="font-semibold text-slate-800">{lead.city && lead.city !== "nan" ? lead.city : "N/A"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-600">
                                <Mail className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-slate-400">Last Activity:</span>
                                <span className="font-semibold text-slate-800">{lead.last_activity || "N/A"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-slate-600">
                                <Activity className="h-3.5 w-3.5 text-slate-400" />
                                <span className="text-slate-400">Tags:</span>
                                <span className="font-semibold text-slate-800 truncate">{lead.tags || "N/A"}</span>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer stats & Pagination with Next button matching LeadsTable */}
        <div className="p-3 sm:px-5 sm:py-3 border-t border-slate-100 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="font-semibold text-slate-700">{filteredLeads.length === 0 ? 0 : startIndex + 1}</strong> to{" "}
              <strong className="font-semibold text-slate-700">{Math.min(startIndex + pageSize, filteredLeads.length)}</strong> of{" "}
              <strong className="font-semibold text-slate-700">{filteredLeads.length}</strong> leads
            </span>
            <span className="hidden md:inline text-[11px] text-slate-400">
              • XGBoost Intelligence
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 mr-1.5">
              Page <strong className="font-semibold text-slate-800">{currentPage}</strong> of{" "}
              <strong className="font-semibold text-slate-800">{totalPages}</strong>
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="h-8 px-2.5 text-xs bg-white border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Previous
            </Button>

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="h-8 px-3.5 text-xs bg-black text-white hover:bg-black/85 disabled:opacity-40 shadow-xs"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
