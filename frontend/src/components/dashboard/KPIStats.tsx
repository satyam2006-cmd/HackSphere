import React from "react";
import { Users, Target, TrendingUp, Sparkles, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LeadItem } from "@/types/crm";
import { ModelMetrics } from "@/types/crm";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Legend,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface KPIStatsProps {
  leads: LeadItem[];
  metrics: ModelMetrics | null;
}

export function KPIStats({ leads, metrics }: KPIStatsProps) {
  const getCategory = (lead: LeadItem) => {
    const predicted = lead.predicted_class?.trim();
    if (predicted === "Hot" || predicted === "Warm" || predicted === "Cold") {
      return predicted;
    }
    const likelihood = lead.conversion_probability * 100;
    return likelihood >= 80 ? "Hot" : likelihood >= 40 ? "Warm" : "Cold";
  };

  const totalLeads = leads.length;
  const highPriorityCount = leads.filter(
    (l) => l.priority.toLowerCase() === "high" || l.conversion_probability >= 0.7
  ).length;

  const avgConvProb = totalLeads > 0
    ? Math.round(
        (leads.reduce((acc, curr) => acc + curr.conversion_probability, 0) / totalLeads) * 100
      )
    : 0;

  const stats = [
    {
      title: "Total Tracked Leads",
      value: totalLeads.toString(),
      subtext: "Current scored queue",
      icon: Users,
      color: "from-blue-600 to-indigo-600",
      accentBg: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
      badge: "Live",
    },
    {
      title: "High-Likelihood Leads",
      value: highPriorityCount.toString(),
      subtext: `${Math.round((highPriorityCount / (totalLeads || 1)) * 100)}% of total queue`,
      icon: Target,
      color: "from-violet-600 to-purple-600",
      accentBg: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400",
      badge: "Priority",
    },
    {
      title: "Avg Conversion Likelihood",
      value: `${avgConvProb}%`,
      subtext: `${metrics?.training_rows ?? 0} synthetic training rows`,
      icon: TrendingUp,
      color: "from-emerald-500 to-teal-600",
      accentBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
      badge: "XGBoost",
    },
    {
      title: "Model Accuracy",
      value: metrics ? `${Math.round(metrics.accuracy * 100)}%` : "--",
      subtext: "Training-set accuracy",
      icon: Sparkles,
      color: "from-amber-500 to-orange-600",
      accentBg: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
      badge: metrics ? "Verified" : "Loading",
    },
  ];

  const chartLeads = leads.slice(0, 8).map((lead, index) => {
    const category = getCategory(lead);
    return {
      name: lead.name?.trim() || lead.contact_name?.trim() || lead.lead_id || `Lead ${index + 1}`,
      likelihood: Math.round(lead.conversion_probability * 100),
      category,
      color: category === "Hot" ? "#e11d48" : category === "Warm" ? "#d97706" : "#0284c7",
    };
  });
  const outcomeData = [
    { name: "Hot", value: leads.filter((lead) => getCategory(lead) === "Hot") .length, color: "#e11d48" },
    { name: "Warm", value: leads.filter((lead) => getCategory(lead) === "Warm").length, color: "#d97706" },
    { name: "Cold", value: leads.filter((lead) => getCategory(lead) === "Cold").length, color: "#0284c7" },
  ];
  const trendData = leads.map((lead, index) => {
    const likelihood = Math.round(lead.conversion_probability * 100);
    const confidence = Math.round(Math.min(1, Math.max(0, lead.confidence)) * 100);
    const category = getCategory(lead);
    return {
    lead: index + 1,
      likelihood,
      confidence,
      hot: category === "Hot" ? likelihood : null,
      warm: category === "Warm" ? likelihood : null,
      cold: category === "Cold" ? likelihood : null,
    };
  });

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <Card key={i} className="chart-card border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl ${stat.accentBg} transition-transform group-hover:scale-105`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                  {stat.badge}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-medium text-slate-500 tracking-wide uppercase">{stat.title}</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">{stat.value}</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">{stat.subtext}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
      </div>
      <div className="mt-5 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="chart-card border-slate-200/80 shadow-sm xl:col-span-2">
          <CardContent className="p-5">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Lead likelihood
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Highest-ranked leads from the XGBoost scoring queue
              </p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartLeads} layout="vertical" margin={{ left: 12, right: 38, top: 4, bottom: 4 }}>
                  <CartesianGrid horizontal={false} stroke="#e5e5e5" />
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={132} tick={{ fill: "#111111", fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [`${value ?? 0}%`, "Likelihood"]}
                    labelFormatter={(label) => {
                      const lead = chartLeads.find((item) => item.name === label);
                      return `${label} · ${lead?.category ?? "Cold"}`;
                    }}
                  />
                  <Bar dataKey="likelihood" radius={4} barSize={22}>
                    {chartLeads.map((lead) => (
                      <Cell key={`${lead.name}-${lead.category}`} fill={lead.color} />
                    ))}
                    <LabelList dataKey="likelihood" position="right" formatter={(value) => `${value ?? 0}%`} fill="#111111" fontSize={12} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="chart-card border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <div className="mb-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Predicted outcomes
              </p>
              <p className="text-xs text-slate-400 mt-1">Scored queue distribution</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="donutHot" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#be123c" />
                      <stop offset="100%" stopColor="#fb7185" />
                    </linearGradient>
                    <linearGradient id="donutWarm" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#b45309" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                    <linearGradient id="donutCold" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#0369a1" />
                      <stop offset="100%" stopColor="#38bdf8" />
                    </linearGradient>
                  </defs>
                  <Pie data={outcomeData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={94} paddingAngle={4} stroke="#ffffff" strokeOpacity={0.9} strokeWidth={3}>
                    {outcomeData.map((entry, index) => (
                      <Cell key={entry.name} fill={`url(#${["donutHot", "donutWarm", "donutCold"][index]})`} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="chart-card border-slate-200/80 shadow-sm xl:col-span-3">
          <CardContent className="p-5">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Category & confidence trend
                </p>
                <p className="text-xs text-slate-400 mt-1">Hot, Warm, Cold likelihood and model confidence for the active queue</p>
              </div>
              <span className="text-xs font-semibold text-black/50">0–100%</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e5e5e5" />
                  <XAxis dataKey="lead" tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={36} />
                  <Tooltip formatter={(value) => [`${value ?? 0}%`, "Score"]} />
                  <Legend />
                  <Line dataKey="hot" name="Hot likelihood" type="monotone" stroke="#e11d48" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                  <Line dataKey="warm" name="Warm likelihood" type="monotone" stroke="#d97706" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                  <Line dataKey="cold" name="Cold likelihood" type="monotone" stroke="#0284c7" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                  <Line dataKey="confidence" name="Confidence" type="monotone" stroke="#111111" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
