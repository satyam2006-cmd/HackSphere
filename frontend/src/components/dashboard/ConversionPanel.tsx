import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ScoredLead,
  ScoredLeadListResponse,
  PipelineDemoResponse,
  PipelineDemoSummary,
  CleaningReport,
  InjectedPipelineResponse,
  ConversionMetrics,
} from "@/types/crm";
import {
  Flame,
  TrendingUp,
  Snowflake,
  Target,
  BarChart3,
  Users,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  Award,
  Globe,
  MapPin,
  Briefcase,
  Mail,
  Eye,
  Clock,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Sparkles,
  Upload,
  FileText,
  Download,
  Filter,
  Check,
  Cpu,
} from "lucide-react";

interface ConversionPanelProps {
  className?: string;
}

const categoryStyles: Record<
  string,
  {
    bg: string;
    text: string;
    ring: string;
    barColor: string;
    icon: React.ReactNode;
    badge: string;
  }
> = {
  Hot: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    ring: "ring-rose-200",
    barColor: "bg-gradient-to-r from-rose-500 to-pink-500",
    icon: <Flame className="h-3.5 w-3.5 text-rose-600" />,
    badge: "bg-rose-100 text-rose-800",
  },
  Warm: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-200",
    barColor: "bg-gradient-to-r from-amber-500 to-orange-500",
    icon: <TrendingUp className="h-3.5 w-3.5 text-amber-600" />,
    badge: "bg-amber-100 text-amber-800",
  },
  Cold: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    ring: "ring-sky-200",
    barColor: "bg-gradient-to-r from-sky-400 to-indigo-400",
    icon: <Snowflake className="h-3.5 w-3.5 text-sky-600" />,
    badge: "bg-sky-100 text-sky-800",
  },
};

const confidenceBadges: Record<string, string> = {
  "Very High": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  High: "bg-teal-50 text-teal-700 ring-teal-200",
  Moderate: "bg-amber-50 text-amber-700 ring-amber-200",
  Low: "bg-slate-50 text-slate-600 ring-slate-200",
};

function LockChanceBar({ percentage, category }: { percentage: number; category: string }) {
  const style = categoryStyles[category] || categoryStyles.Cold;
  return (
    <div className="space-y-1 w-full">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-black">{percentage}%</span>
        <span className="text-[10px] text-black/40 font-medium">lock chance</span>
      </div>
      <div className="h-2 w-full rounded-full bg-black/5 overflow-hidden">
        <div
          className={`h-full rounded-full ${style.barColor} transition-all duration-700`}
          style={{ width: `${Math.min(100, Math.max(2, percentage))}%` }}
        />
      </div>
    </div>
  );
}

export function ConversionPanel({ className = "" }: ConversionPanelProps) {
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
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  // Injection Studio State
  const [rawInputText, setRawInputText] = useState<string>("");
  const [injecting, setInjecting] = useState<boolean>(false);
  const [showCleaningDetails, setShowCleaningDetails] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchVerification20 = async () => {
    try {
      setLoading(true);
      setError(null);
      const [demoRes, metricsRes] = await Promise.all([
        fetch("/conversion/demo-pipeline-20"),
        fetch("/conversion/metrics"),
      ]);

      if (!demoRes.ok) throw new Error(`Verification dataset error: ${demoRes.status}`);
      if (!metricsRes.ok) throw new Error(`Metrics error: ${metricsRes.status}`);

      const demoData: PipelineDemoResponse = await demoRes.json();
      const metricsData: ConversionMetrics = await metricsRes.json();

      setLeads(demoData.leads);
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
        fetch(`/conversion/scored-leads?${params.toString()}`),
        fetch("/conversion/metrics"),
      ]);

      if (!leadsRes.ok) throw new Error(`Scored leads: ${leadsRes.status}`);
      if (!metricsRes.ok) throw new Error(`Metrics: ${metricsRes.status}`);

      const leadsData: ScoredLeadListResponse = await leadsRes.json();
      const metricsData: ConversionMetrics = await metricsRes.json();

      setLeads(leadsData.leads);
      if (leadsData.category_counts) {
        setCategoryCounts(leadsData.category_counts);
      }
      setMetrics(metricsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load full lead intelligence");
    } finally {
      setLoading(false);
    }
  };

  const runLiveVerificationPipeline = async () => {
    try {
      setBenchmarking(true);
      setError(null);
      const res = await fetch("/conversion/demo-pipeline-20/run", { method: "POST" });
      if (!res.ok) throw new Error(`Pipeline run failed: ${res.status}`);

      const data: PipelineDemoResponse = await res.json();
      setLeads(data.leads);
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

  // Load sample raw dataset from backend for instant testing
  const loadSampleRawDataset = async () => {
    try {
      setLoading(true);
      const res = await fetch("/conversion/sample-injection-dataset");
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

  // Handle file upload (CSV or JSON)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawInputText(content);
    };
    reader.readAsText(file);
  };

  // Execute full cleaning & prediction pipeline on injected dataset
  const executeInjectedPipeline = async () => {
    try {
      setInjecting(true);
      setError(null);

      let payload: { leads?: object[]; csv_text?: string } = {};

      const trimmed = rawInputText.trim();
      if (!trimmed) {
        // Run with fallback sample
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

      const res = await fetch("/conversion/inject-pipeline", {
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

  useEffect(() => {
    if (dataSource === "verification20") {
      fetchVerification20();
    } else if (dataSource === "full") {
      fetchFullScoredLeads();
    } else if (dataSource === "inject") {
      if (!rawInputText) {
        loadSampleRawDataset();
      }
    }
  }, [dataSource, category]);

  // Download results as CSV or JSON
  const downloadResults = (format: "csv" | "json") => {
    if (leads.length === 0) return;
    let dataStr = "";
    let mimeType = "";
    let fileName = `cleaned_scored_leads.${format}`;

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
        l.lock_chance_pct,
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

  const displayedLeads = leads.filter((l) => {
    if (category === "all") return true;
    return l.lead_category.toLowerCase() === category.toLowerCase();
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top Header Card: Pipeline Status & Performance */}
      {metrics && (
        <Card className="border-black/5 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight">{metrics.model_name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Live Pipeline Ready
                  </span>
                </div>
                <p className="text-xs text-white/60">
                  End-to-End XGBoost Classification · Automatic Missing Data Imputation · TreeSHAP Attribution · 3-Class Conversion Tiers
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/10 text-white border border-white/15">
                ROC-AUC {(metrics.roc_auc_score * 100).toFixed(1)}%
              </span>
              <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/10 text-white border border-white/15">
                F1-Score {(metrics.f1_score * 100).toFixed(1)}%
              </span>
              <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/10 text-white border border-white/15">
                Recall {(metrics.recall * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <CardContent className="py-3 px-6 bg-slate-50/50 border-t border-black/5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4 text-xs text-black/60">
                <span className="flex items-center gap-1.5 font-medium">
                  <Target className="h-3.5 w-3.5 text-indigo-600" />
                  Optimal Threshold: <strong className="text-black">{(metrics.threshold * 100).toFixed(0)}%</strong>
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Flame className="h-3.5 w-3.5 text-rose-600" />
                  Hot Tier: <strong className="text-black">&ge; {metrics.hot_threshold}%</strong>
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                  Warm Tier: <strong className="text-black">{metrics.warm_threshold} - {metrics.hot_threshold - 1}%</strong>
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Snowflake className="h-3.5 w-3.5 text-sky-600" />
                  Cold Tier: <strong className="text-black">&lt; {metrics.warm_threshold}%</strong>
                </span>
              </div>

              {lastExecutionMs !== null && (
                <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Pipeline scored leads in {lastExecutionMs}ms
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dataset View Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-black/5 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-black/70 mr-1">Pipeline Mode:</span>
          <div className="flex items-center p-1 bg-black/5 rounded-xl gap-1 flex-wrap">
            <button
              onClick={() => setDataSource("verification20")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                dataSource === "verification20"
                  ? "bg-white text-black shadow-sm"
                  : "text-black/50 hover:text-black"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              20-Lead Verification Dataset (Live)
            </button>
            <button
              onClick={() => setDataSource("inject")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                dataSource === "inject"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-black/50 hover:text-black"
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              Inject &amp; Clean Custom Dataset
            </button>
            <button
              onClick={() => setDataSource("full")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                dataSource === "full"
                  ? "bg-white text-black shadow-sm"
                  : "text-black/50 hover:text-black"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5 text-black/40" />
              Full Database (1,848 Leads)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {dataSource === "verification20" && (
            <Button
              size="sm"
              onClick={runLiveVerificationPipeline}
              disabled={benchmarking}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3 rounded-lg shadow-sm flex items-center gap-1.5"
            >
              {benchmarking ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {benchmarking ? "Scoring 20 Leads Live…" : "Re-run 20-Lead Live Pipeline"}
            </Button>
          )}

          {leads.length > 0 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadResults("csv")}
                className="text-xs h-8 border-black/10 text-black/70 rounded-lg flex items-center gap-1"
              >
                <Download className="h-3 w-3" /> CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadResults("json")}
                className="text-xs h-8 border-black/10 text-black/70 rounded-lg flex items-center gap-1"
              >
                <Download className="h-3 w-3" /> JSON
              </Button>
            </div>
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
            className="text-xs h-8 border-black/10 text-black/70 rounded-lg"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading || injecting ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* INJECTION STUDIO CARD (When in "inject" mode) */}
      {dataSource === "inject" && (
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/30 shadow-md">
          <CardHeader className="py-3 px-5 border-b border-indigo-100 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                <Cpu className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-black">
                  Lead Intelligence Injection &amp; Data Cleaning Studio
                </CardTitle>
                <p className="text-[11px] text-black/50">
                  Inject raw, uncleaned CSV or JSON leads. The pipeline handles schema alignment, imputes missing values, and scores conversion probability with TreeSHAP explainability.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv,.json"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs h-8 border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 flex items-center gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" /> Upload File (.csv / .json)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadSampleRawDataset}
                disabled={loading}
                className="text-xs h-8 border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" /> Load 25-Lead Raw Sample
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5 text-xs">
                <span className="font-semibold text-black/70 flex items-center gap-1">
                  Raw Lead Input (JSON Array or CSV Format):
                </span>
                <span className="text-[11px] text-black/40">
                  Accepts missing fields, dirty numerical strings (e.g. &apos;1840s&apos;), and arbitrary alias keys
                </span>
              </div>
              <textarea
                value={rawInputText}
                onChange={(e) => setRawInputText(e.target.value)}
                placeholder="Paste raw CSV or JSON leads array here, or click 'Load 25-Lead Raw Sample' above..."
                rows={7}
                className="w-full font-mono text-xs p-3 rounded-xl border border-black/10 bg-white shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
              />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs text-black/60 flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Automatic preprocessing includes Median &amp; Mode SimpleImputers + 158-dimension OneHot encoder</span>
              </div>

              <Button
                size="default"
                onClick={executeInjectedPipeline}
                disabled={injecting}
                className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs h-9 px-5 rounded-xl shadow-md flex items-center gap-2"
              >
                {injecting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {injecting ? "Cleaning Data & Scoring Pipeline…" : "Clean Data & Run Entire Pipeline"}
              </Button>
            </div>

            {/* Cleaning Report Banner (Displayed after execution) */}
            {cleaningReport && (
              <div className="mt-3 p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Data Cleaning &amp; Pipeline Execution Complete ({lastExecutionMs}ms)</span>
                  </div>
                  <button
                    onClick={() => setShowCleaningDetails(!showCleaningDetails)}
                    className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold underline flex items-center gap-1"
                  >
                    {showCleaningDetails ? "Hide Cleaning Steps" : "View Cleaning Steps"}
                    {showCleaningDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs text-emerald-800 flex-wrap">
                  <span>✓ <strong>{cleaningReport.total_records}</strong> records cleaned</span>
                  <span>✓ <strong>{cleaningReport.missing_values_imputed}</strong> missing values imputed</span>
                  <span>✓ <strong>{cleaningReport.fields_normalized}</strong> alias keys standardized</span>
                  <span>✓ <strong>158</strong> features scaled &amp; encoded</span>
                </div>

                {showCleaningDetails && (
                  <ul className="mt-2 pt-2 border-t border-emerald-200/60 space-y-1 text-xs text-emerald-900">
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
          </CardContent>
        </Card>
      )}

      {/* Conversion Chances & Evidence Summary by Class */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Hot Card */}
        <Card className="border-rose-200/60 shadow-sm bg-gradient-to-br from-rose-50/50 via-white to-rose-50/30 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-rose-100 flex items-center justify-center">
                  <Flame className="h-4 w-4 text-rose-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wide">Hot Leads</h4>
                  <p className="text-[10px] text-rose-700/70 font-medium">&ge; 80% Conversion Score</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                {categoryCounts.hot} leads
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-rose-100/80 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-black/60">Lock Likelihood:</span>
                <span className="text-xl font-extrabold text-rose-600">
                  {demoSummary ? `${demoSummary.hot_avg_lock_chance.toFixed(1)}%` : "80 - 99%"}
                </span>
              </div>
              <div className="text-[11px] text-rose-900/80 bg-white/70 p-2 rounded-lg border border-rose-100">
                <p className="font-semibold text-rose-950 mb-0.5">Top Model Evidence Signals:</p>
                <p>High web time (&gt;1000s), Add Form origin, Horizzon close tag, executive profile.</p>
              </div>
              <p className="text-[10px] text-rose-700 font-medium flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" /> Recommended Play: 1-hour VIP close call
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Warm Card */}
        <Card className="border-amber-200/60 shadow-sm bg-gradient-to-br from-amber-50/50 via-white to-amber-50/30 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">Warm Leads</h4>
                  <p className="text-[10px] text-amber-700/70 font-medium">40 - 79% Conversion Score</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                {categoryCounts.warm} leads
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-amber-100/80 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-black/60">Lock Likelihood:</span>
                <span className="text-xl font-extrabold text-amber-600">
                  {demoSummary ? `${demoSummary.warm_avg_lock_chance.toFixed(1)}%` : "40 - 79%"}
                </span>
              </div>
              <div className="text-[11px] text-amber-900/80 bg-white/70 p-2 rounded-lg border border-amber-100">
                <p className="font-semibold text-amber-950 mb-0.5">Top Model Evidence Signals:</p>
                <p>Moderate engagement, email opened, organic interest, evaluation in progress.</p>
              </div>
              <p className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" /> Recommended Play: ROI calculator &amp; technical demo
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cold Card */}
        <Card className="border-sky-200/60 shadow-sm bg-gradient-to-br from-sky-50/50 via-white to-sky-50/30 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-sky-100 flex items-center justify-center">
                  <Snowflake className="h-4 w-4 text-sky-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-sky-950 uppercase tracking-wide">Cold Leads</h4>
                  <p className="text-[10px] text-sky-700/70 font-medium">&lt; 40% Conversion Score</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
                {categoryCounts.cold} leads
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-sky-100/80 space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-black/60">Lock Likelihood:</span>
                <span className="text-xl font-extrabold text-sky-600">
                  {demoSummary ? `${demoSummary.cold_avg_lock_chance.toFixed(1)}%` : "2 - 39%"}
                </span>
              </div>
              <div className="text-[11px] text-sky-900/80 bg-white/70 p-2 rounded-lg border border-sky-100">
                <p className="font-semibold text-sky-950 mb-0.5">Top Model Evidence Signals:</p>
                <p>Minimal site time (&lt;100s), ringing / unanswered tags, student / passive profile.</p>
              </div>
              <p className="text-[10px] text-sky-700 font-medium flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" /> Recommended Play: Low-touch drip automation
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-black/5 p-1 rounded-xl">
          {[
            { id: "all", label: "All", count: categoryCounts.all },
            { id: "Hot", label: "Hot", count: categoryCounts.hot },
            { id: "Warm", label: "Warm", count: categoryCounts.warm },
            { id: "Cold", label: "Cold", count: categoryCounts.cold },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setCategory(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                category === item.id
                  ? "bg-white text-black shadow-sm font-semibold"
                  : "text-black/50 hover:text-black"
              }`}
            >
              <span>{item.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  category === item.id ? "bg-black/10 text-black" : "bg-black/5 text-black/50"
                }`}
              >
                {item.count}
              </span>
            </button>
          ))}
        </div>

        <div className="text-xs text-black/50">
          Showing <strong>{displayedLeads.length}</strong> leads
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Leads Table with Evidence, Confidence, and Lock Chance */}
      <Card className="border-black/5 shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-5 border-b border-black/5 bg-black/[0.01]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-black flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              {dataSource === "verification20"
                ? "20-Lead Live Pipeline Verification Dataset"
                : dataSource === "inject"
                ? "Cleaned & Scored Injected Dataset"
                : "CRM Lead Conversion Pipeline"}
            </CardTitle>
            <span className="text-[11px] text-black/50">
              Ranked by XGBoost Lock Likelihood
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading && leads.length === 0 ? (
            <div className="flex items-center justify-center py-20 flex-col gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
              <span className="text-sm text-black/50">Loading pipeline intelligence…</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black/5 bg-black/[0.02] text-black/50 text-[10px] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4 text-left">Rank &amp; Contact</th>
                    <th className="py-3 px-4 text-left">Class</th>
                    <th className="py-3 px-4 text-left min-w-[150px]">Chances to Lock Lead</th>
                    <th className="py-3 px-4 text-left">Confidence</th>
                    <th className="py-3 px-4 text-left min-w-[220px]">Primary Evidence / Why Predicted</th>
                    <th className="py-3 px-4 text-left">Origin / Source</th>
                    <th className="py-3 px-4 text-center">Actual Converted</th>
                    <th className="py-3 px-3 text-center" />
                  </tr>
                </thead>
                <tbody>
                  {displayedLeads.map((lead) => {
                    const style = categoryStyles[lead.lead_category] || categoryStyles.Cold;
                    const isExpanded = expandedLead === lead.lead_id;
                    const confBadge = confidenceBadges[lead.confidence_level] || confidenceBadges.Moderate;

                    return (
                      <React.Fragment key={lead.lead_id}>
                        <tr
                          className={`border-b border-black/5 hover:bg-black/[0.015] cursor-pointer transition-colors ${
                            isExpanded ? "bg-indigo-50/30" : ""
                          }`}
                          onClick={() => setExpandedLead(isExpanded ? null : lead.lead_id)}
                        >
                          {/* Rank & Contact */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-black/40 font-bold text-xs">
                                #{lead.sales_rank}
                              </span>
                              <div>
                                <p className="font-semibold text-black text-xs">
                                  {lead.contact_name || lead.lead_id}
                                </p>
                                <p className="text-[10px] text-black/50 flex items-center gap-1">
                                  <Building2 className="h-3 w-3 text-black/30" />
                                  {lead.company || lead.lead_id}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Class Badge */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ring-1 ${style.bg} ${style.text} ${style.ring}`}
                            >
                              {style.icon}
                              {lead.lead_category}
                            </span>
                          </td>

                          {/* Chances to Lock Lead */}
                          <td className="py-3 px-4">
                            <LockChanceBar
                              percentage={lead.lock_chance_pct || Math.round(lead.predicted_probability * 100)}
                              category={lead.lead_category}
                            />
                          </td>

                          {/* Confidence Level */}
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ring-1 ${confBadge}`}
                            >
                              {lead.confidence_level || "Moderate"}
                            </span>
                          </td>

                          {/* Primary Evidence / Signals */}
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 text-[11px] font-medium border border-indigo-100">
                                <Target className="h-3 w-3 text-indigo-600 shrink-0" />
                                <span className="truncate max-w-[200px]">{lead.primary_driver || "Baseline Profile"}</span>
                              </div>
                              {lead.positive_evidence && lead.positive_evidence.length > 1 && (
                                <div className="text-[10px] text-emerald-700 flex items-center gap-1">
                                  <span>+</span>
                                  <span className="truncate max-w-[200px]">{lead.positive_evidence[1]}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Origin / Source */}
                          <td className="py-3 px-4 text-black/70">
                            <div>
                              <p className="font-medium text-[11px] text-black">
                                {lead.lead_origin || "Direct"}
                              </p>
                              <p className="text-[10px] text-black/40">
                                {lead.lead_source || "Unspecified"}
                              </p>
                            </div>
                          </td>

                          {/* Actual Outcome */}
                          <td className="py-3 px-4 text-center">
                            {lead.actual_converted === 1 ? (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">
                                ✓
                              </span>
                            ) : (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/5 text-black/30 text-xs">
                                ✗
                              </span>
                            )}
                          </td>

                          {/* Expand chevron */}
                          <td className="py-3 px-3 text-center">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-black/40" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-black/40" />
                            )}
                          </td>
                        </tr>

                        {/* Expanded Detail View: Full Evidence Breakdown & Recommended Lock Strategy */}
                        {isExpanded && (
                          <tr className="bg-slate-50/70 border-b border-black/5">
                            <td colSpan={8} className="px-6 py-4 space-y-3">
                              {/* Recommended Lock Strategy Banner */}
                              <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 flex items-start gap-3">
                                <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                  <Zap className="h-3.5 w-3.5" />
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-xs font-bold text-indigo-950">
                                    Recommended Action to Lock This Client:
                                  </p>
                                  <p className="text-xs text-indigo-900">
                                    {lead.lock_strategy || "Execute high-touch discovery call."}
                                  </p>
                                </div>
                              </div>

                              {/* Evidence Attribution (Positive vs Negative Decision Factors) */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-1.5">
                                  <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                    Positive Evidence (Pushed Conversion UP)
                                  </p>
                                  {lead.positive_evidence && lead.positive_evidence.length > 0 ? (
                                    <ul className="space-y-1">
                                      {lead.positive_evidence.map((ev, i) => (
                                        <li
                                          key={i}
                                          className="text-xs text-emerald-800 flex items-center gap-1.5 bg-white/80 px-2 py-1 rounded-md border border-emerald-100"
                                        >
                                          <span className="font-bold text-emerald-600">+</span>
                                          <span>{ev}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-xs text-black/50 italic">No strong positive drivers detected.</p>
                                  )}
                                </div>

                                <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-100 space-y-1.5">
                                  <p className="text-[11px] font-bold text-rose-900 uppercase tracking-wide flex items-center gap-1.5">
                                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                                    Friction Signals (Pushed Conversion DOWN)
                                  </p>
                                  {lead.negative_evidence && lead.negative_evidence.length > 0 ? (
                                    <ul className="space-y-1">
                                      {lead.negative_evidence.map((ev, i) => (
                                        <li
                                          key={i}
                                          className="text-xs text-rose-800 flex items-center gap-1.5 bg-white/80 px-2 py-1 rounded-md border border-rose-100"
                                        >
                                          <span className="font-bold text-rose-600">-</span>
                                          <span>{ev}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-xs text-black/50 italic">Low friction profile.</p>
                                  )}
                                </div>
                              </div>

                              {/* Lead Raw Attributes Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs border-t border-black/5">
                                <div className="flex items-center gap-2 text-black/60">
                                  <Clock className="h-3.5 w-3.5 text-indigo-500/60" />
                                  <span className="text-black/40">Website Time:</span>
                                  <span className="font-semibold text-black">
                                    {Math.round(lead.total_time_on_website)}s
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-black/60">
                                  <Eye className="h-3.5 w-3.5 text-indigo-500/60" />
                                  <span className="text-black/40">Total Visits:</span>
                                  <span className="font-semibold text-black">{lead.total_visits}</span>
                                </div>
                                <div className="flex items-center gap-2 text-black/60">
                                  <Briefcase className="h-3.5 w-3.5 text-indigo-500/60" />
                                  <span className="text-black/40">Occupation:</span>
                                  <span className="font-semibold text-black">{lead.occupation || "N/A"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-black/60">
                                  <Award className="h-3.5 w-3.5 text-indigo-500/60" />
                                  <span className="text-black/40">Quality:</span>
                                  <span className="font-semibold text-black">{lead.lead_quality || "N/A"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-black/60">
                                  <Globe className="h-3.5 w-3.5 text-indigo-500/60" />
                                  <span className="text-black/40">Country:</span>
                                  <span className="font-semibold text-black">{lead.country || "N/A"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-black/60">
                                  <MapPin className="h-3.5 w-3.5 text-indigo-500/60" />
                                  <span className="text-black/40">City:</span>
                                  <span className="font-semibold text-black">
                                    {lead.city && lead.city !== "nan" ? lead.city : "N/A"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-black/60">
                                  <Mail className="h-3.5 w-3.5 text-indigo-500/60" />
                                  <span className="text-black/40">Last Activity:</span>
                                  <span className="font-semibold text-black">{lead.last_activity || "N/A"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-black/60">
                                  <Activity className="h-3.5 w-3.5 text-indigo-500/60" />
                                  <span className="text-black/40">Specialization:</span>
                                  <span className="font-semibold text-black">{lead.specialization || "N/A"}</span>
                                </div>
                              </div>

                              {lead.tags && (
                                <div className="flex items-center gap-2 text-xs pt-1">
                                  <span className="text-black/40">Tags:</span>
                                  <span className="px-2 py-0.5 rounded bg-black/5 text-black/70 font-medium">
                                    {lead.tags}
                                  </span>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
