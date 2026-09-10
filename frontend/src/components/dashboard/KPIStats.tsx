import React from "react";
import { Users, Target, TrendingUp, Sparkles, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LeadItem } from "@/types/crm";

interface KPIStatsProps {
  leads: LeadItem[];
}

export function KPIStats({ leads }: KPIStatsProps) {
  const totalLeads = leads.length;
  const highPriorityCount = leads.filter(
    (l) => l.priority.toLowerCase() === "high" || l.conversion_probability >= 0.7
  ).length;

  const avgConvProb = totalLeads > 0
    ? Math.round(
        (leads.reduce((acc, curr) => acc + curr.conversion_probability, 0) / totalLeads) * 100
      )
    : 0;

  const qualifiedCount = leads.filter(
    (l) => l.predicted_label === 1 || l.predicted_label === 2
  ).length;
  const qualifiedPercentage = totalLeads > 0 ? Math.round((qualifiedCount / totalLeads) * 100) : 0;

  const stats = [
    {
      title: "Total Tracked Leads",
      value: totalLeads.toString(),
      subtext: "+14.2% from last cycle",
      icon: Users,
      color: "from-blue-600 to-indigo-600",
      accentBg: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
      badge: "+12 new",
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
      subtext: "XGBoost softprob calibrated",
      icon: TrendingUp,
      color: "from-emerald-500 to-teal-600",
      accentBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
      badge: "Calibrated",
    },
    {
      title: "AI Qualified Outcomes",
      value: `${qualifiedPercentage}%`,
      subtext: `${qualifiedCount} leads ready for review`,
      icon: Sparkles,
      color: "from-amber-500 to-orange-600",
      accentBg: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
      badge: "Targeted",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <Card key={i} className="border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
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
  );
}
