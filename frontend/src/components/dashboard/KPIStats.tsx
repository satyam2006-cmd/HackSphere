import React from "react";
import { Users, Target, TrendingUp, Sparkles, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LeadItem } from "@/types/crm";
import { ModelMetrics } from "@/types/crm";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Area,
  AreaChart,
  Cell,
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

  const chartLeads = leads.slice(0, 8).map((lead, index) => ({
    name: `Lead ${index + 1}`,
    likelihood: Math.round(lead.conversion_probability * 100),
  }));
  const outcomeData = [
    { name: "Other", value: leads.filter((lead) => lead.predicted_label === 0).length },
    { name: "Converted", value: leads.filter((lead) => lead.predicted_label === 1).length },
    { name: "Qualified", value: leads.filter((lead) => lead.predicted_label === 2).length },
  ];
  const trendData = leads.map((lead, index) => ({
    lead: index + 1,
    likelihood: Math.round(lead.conversion_probability * 100),
  }));

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
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={64} tick={{ fill: "#111111", fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${value}%`, "Likelihood"]} />
                  <Bar dataKey="likelihood" fill="#111111" radius={4} barSize={22}>
                    <LabelList dataKey="likelihood" position="right" formatter={(value) => `${value}%`} fill="#111111" fontSize={12} />
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
                    <linearGradient id="donutOther" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#686868" />
                      <stop offset="100%" stopColor="#bdbdbd" />
                    </linearGradient>
                    <linearGradient id="donutConverted" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#9a9a9a" />
                      <stop offset="100%" stopColor="#d0d0d0" />
                    </linearGradient>
                    <linearGradient id="donutQualified" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#c4c4c4" />
                      <stop offset="100%" stopColor="#eeeeee" />
                    </linearGradient>
                  </defs>
                  <Pie data={outcomeData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={94} paddingAngle={4} stroke="#ffffff" strokeOpacity={0.9} strokeWidth={3}>
                    {outcomeData.map((entry, index) => (
                      <Cell key={entry.name} fill={`url(#${["donutOther", "donutConverted", "donutQualified"][index]})`} />
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
                  Scoring trend
                </p>
                <p className="text-xs text-slate-400 mt-1">Conversion likelihood across the ranked queue</p>
              </div>
              <span className="text-xs font-semibold text-black/50">0–100%</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="likelihoodShade" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#111111" stopOpacity={0.28} />
                      <stop offset="70%" stopColor="#737373" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#d4d4d4" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e5e5e5" />
                  <XAxis dataKey="lead" tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={36} />
                  <Tooltip formatter={(value) => [`${value}%`, "Likelihood"]} />
                  <Area dataKey="likelihood" type="natural" stroke="#111111" strokeWidth={3} fill="url(#likelihoodShade)" fillOpacity={1} dot={{ r: 3, fill: "#111111" }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
