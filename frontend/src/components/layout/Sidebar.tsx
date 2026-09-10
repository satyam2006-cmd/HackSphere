import React from "react";
import {
  LayoutDashboard,
  Users,
  Target,
  BarChart3,
  Mail,
  Settings,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  leadCount: number;
}

export function Sidebar({ currentTab, onSelectTab, leadCount }: SidebarProps) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "leads", label: "Leads Intelligence", icon: Users, badge: leadCount ? `${leadCount}` : undefined },
    { id: "pipeline", label: "Prioritized Queue", icon: Target },
    { id: "analytics", label: "Model Analytics", icon: BarChart3 },
    { id: "outreach", label: "Outreach Center", icon: Mail },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800 shrink-0 select-none min-h-screen">
      {/* Brand Logo Header */}
      <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-white font-sans">Syncrowave</span>
              <Badge variant="outline" className="text-[10px] py-0 px-1 text-indigo-400 border-indigo-500/30 bg-indigo-950/40">
                AI CRM
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Lead Conversion Suite</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-3 py-6 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Main Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-4 w-4 transition-transform group-hover:scale-110 ${
                    isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-400"
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-800 text-slate-300 border border-slate-700"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-6 px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          System Intelligence
        </div>
        
        <div className="px-3 py-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-300 space-y-2">
          <div className="flex items-center justify-between font-semibold text-slate-200">
            <span className="flex items-center gap-1.5 text-indigo-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Model Status
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Active (XGBoost)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Trained on 18 privacy-safe reconstructed behavioral features with probability softprob calibration.
          </p>
          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-700/50 text-slate-400">
            <span>Accuracy / AUC</span>
            <span className="font-semibold text-slate-200 flex items-center gap-0.5 text-emerald-400">
              <TrendingUp className="h-3 w-3" /> 92.4%
            </span>
          </div>
        </div>
      </div>

      {/* Footer Profile & Settings */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <button 
          onClick={() => onSelectTab("settings")}
          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/60 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-indigo-500/40">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-xs">
                HS
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <p className="text-sm font-semibold text-white leading-tight">Sales Lead Team</p>
              <p className="text-[11px] text-slate-400">Enterprise Workspace</p>
            </div>
          </div>
          <Settings className="h-4 w-4 text-slate-400 group-hover:text-white transition-colors" />
        </button>
      </div>
    </aside>
  );
}
