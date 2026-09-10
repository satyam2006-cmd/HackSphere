import React, { useState } from "react";
import {
  Search,
  ArrowUpDown,
  Filter,
  Sparkles,
  ChevronRight,
  SlidersHorizontal,
  Building2,
  Calendar,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LeadItem } from "@/types/crm";

interface LeadsTableProps {
  leads: LeadItem[];
  selectedLead: LeadItem | null;
  onSelectLead: (lead: LeadItem) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (priority: string) => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
  onApplyFilters: (filters: {
    searchQuery: string;
    statusFilter: string;
    priorityFilter: string;
    sortBy: string;
  }) => void;
}

export function LeadsTable({
  leads,
  selectedLead,
  onSelectLead,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  sortBy,
  onSortByChange,
  onApplyFilters,
}: LeadsTableProps) {
  const topLeads = leads.slice(0, 10);
  const [draftSearchQuery, setDraftSearchQuery] = useState(searchQuery);
  const [draftStatusFilter, setDraftStatusFilter] = useState(statusFilter);
  const [draftPriorityFilter, setDraftPriorityFilter] = useState(priorityFilter);
  const [draftSortBy, setDraftSortBy] = useState(sortBy);
  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100">High</Badge>;
      case "normal":
        return <Badge className="bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100">Normal</Badge>;
      case "low":
        return <Badge className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getPredictionBadge = (label: number, className: string) => {
    switch (label) {
      case 1:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Converted
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Qualified
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Other
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
      {/* Table Toolbar / Filters */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search leads by name, company, source, sales unit..."
              value={draftSearchQuery}
              onChange={(e) => setDraftSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="pl-9 bg-white border-slate-200 text-sm focus-visible:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Priority filter */}
          <select
            value={draftPriorityFilter}
            onChange={(e) => setDraftPriorityFilter(e.target.value)}
            className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            onClick={(e) => e.stopPropagation()}
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="normal">Normal Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {/* Status filter */}
          <select
            value={draftStatusFilter}
            onChange={(e) => setDraftStatusFilter(e.target.value)}
            className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            onClick={(e) => e.stopPropagation()}
          >
            <option value="all">All Statuses</option>
            <option value="unqualified">Unqualified</option>
            <option value="qualified">Qualified</option>
            <option value="closed">Closed</option>
          </select>

          {/* Sort By */}
          <select
            value={draftSortBy}
            onChange={(e) => setDraftSortBy(e.target.value)}
            className="text-xs h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            onClick={(e) => e.stopPropagation()}
          >
            <option value="conversion_probability">Sort: Likelihood (Highest)</option>
            <option value="priority">Sort: Priority</option>
            <option value="name">Sort: Name</option>
            <option value="status">Sort: Status</option>
          </select>
          <Button
            type="button"
            size="sm"
            onClick={() =>
              onApplyFilters({
                searchQuery: draftSearchQuery,
                statusFilter: draftStatusFilter,
                priorityFilter: draftPriorityFilter,
                sortBy: draftSortBy,
              })
            }
            className="h-9 bg-black px-3 text-xs text-white hover:bg-black/80"
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filter
          </Button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[300px] text-xs font-semibold text-slate-600">Lead & Account</TableHead>
              <TableHead className="text-xs font-semibold text-slate-600">Source</TableHead>
              <TableHead className="text-xs font-semibold text-slate-600">Priority</TableHead>
              <TableHead className="text-xs font-semibold text-slate-600">AI Target Outcome</TableHead>
              <TableHead className="w-[180px] text-xs font-semibold text-slate-600">Conversion Likelihood</TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-600">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                  <div className="max-w-xs mx-auto space-y-2">
                    <p className="font-semibold text-slate-700">No leads match your criteria</p>
                    <p className="text-xs text-slate-500">Try adjusting your search query or reset your priority and status filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              topLeads.map((lead) => {
                const isSelected = selectedLead?.object_id === lead.object_id;
                const percentage = Math.round(lead.conversion_probability * 100);

                return (
                  <TableRow
                    key={lead.object_id}
                    onClick={() => onSelectLead(lead)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-indigo-50/70 hover:bg-indigo-50/90 border-l-4 border-l-indigo-600"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    {/* Lead info */}
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                          {lead.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{lead.name}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            {lead.account_name && (
                              <span className="flex items-center gap-1 truncate">
                                <Building2 className="h-3 w-3" />
                                {lead.account_name}
                              </span>
                            )}
                            {lead.job_title && (
                              <span className="truncate border-l border-slate-200 pl-2">
                                {lead.job_title}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Source */}
                    <TableCell className="py-3.5">
                      <span className="text-xs font-medium text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-md border border-slate-200/60">
                        {lead.source}
                      </span>
                    </TableCell>

                    {/* Priority */}
                    <TableCell className="py-3.5">
                      {getPriorityBadge(lead.priority)}
                    </TableCell>

                    {/* AI Target Outcome */}
                    <TableCell className="py-3.5">
                      {getPredictionBadge(lead.predicted_label, lead.predicted_class)}
                    </TableCell>

                    {/* Likelihood Meter */}
                    <TableCell className="py-3.5">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800">{percentage}%</span>
                          <span className="text-[10px] text-slate-400 font-medium">Confidence: {Math.round(lead.confidence * 100)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              percentage >= 70
                                ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                                : percentage >= 40
                                ? "bg-gradient-to-r from-indigo-500 to-violet-500"
                                : "bg-gradient-to-r from-slate-400 to-slate-500"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectLead(lead);
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                      >
                        Inspect
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Footer stats */}
      <div className="p-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between bg-slate-50/40">
        <span>Showing {topLeads.length} of {leads.length} leads in queue</span>
        <span className="text-[11px] text-slate-400">Ranked by XGBoost multi:softprob conversion probability</span>
      </div>
    </div>
  );
}
