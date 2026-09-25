'use client';

import React, { useState } from 'react';
import { 
  Table, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  CheckCircle, 
  Clock, 
  Flame, 
  AlertTriangle,
  FileText
} from 'lucide-react';
import { useObservations } from '../hooks/useDashboard';
import { DashboardFilters, ObservationItem } from '../lib/types';

interface ObservationsTableProps {
  filters: DashboardFilters;
  onSelectObservation: (obs: ObservationItem) => void;
}

export const ObservationsTable: React.FC<ObservationsTableProps> = ({
  filters,
  onSelectObservation,
}) => {
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [sortBy, setSortBy] = useState('occurrence_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useObservations(filters, page, pageSize, sortBy, sortOrder);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  if (isLoading || !data) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="h-6 w-48 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-50 dark:bg-slate-800/60 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const items = data.items || [];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-500" />
            Safety Observations Master Log
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Showing {items.length} of {data.total.toLocaleString()} filtered records • Click row to inspect full corrective actions & hierarchy.
          </p>
        </div>

        {/* Pagination controls top */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            Page {data.page} of {data.total_pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
            disabled={page >= data.total_pages}
            className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <th className="py-3 px-3">Observation ID</th>
              <th
                className="py-3 px-3 cursor-pointer hover:text-sky-500"
                onClick={() => handleSort('occurrence_date')}
              >
                Date {sortBy === 'occurrence_date' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th className="py-3 px-3">Category & Detail</th>
              <th className="py-3 px-3">Location</th>
              <th
                className="py-3 px-3 cursor-pointer hover:text-sky-500"
                onClick={() => handleSort('risk_level')}
              >
                Risk Level {sortBy === 'risk_level' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Actions Assigned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {items.map((obs) => {
              const isFatal = obs.risk_level === 'Fatal';
              const isSerious = obs.risk_level === 'Serious';
              const isMinor = obs.risk_level === 'Minor';

              return (
                <tr
                  key={obs.id}
                  onClick={() => onSelectObservation(obs)}
                  className="hover:bg-sky-50/50 dark:hover:bg-slate-800/60 cursor-pointer transition"
                >
                  {/* Observation ID & Suffix Badge */}
                  <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-1.5">
                      <span>{obs.observation_id}</span>
                      {obs.has_suffix_s && (
                        <span className="px-1 py-0.2 rounded text-[9px] font-extrabold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          -S
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Date */}
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {obs.occurrence_date}
                    {obs.reporting_lag_days > 0 && (
                      <span className="text-[10px] text-slate-400 block">
                        +{obs.reporting_lag_days}d lag
                      </span>
                    )}
                  </td>

                  {/* Category & Detail */}
                  <td className="py-3 px-3 max-w-[260px]">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {obs.category}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {obs.detail || obs.description}
                    </div>
                  </td>

                  {/* Location */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {obs.unit}
                    </span>
                    <span className="text-[11px] text-slate-400 block truncate max-w-[140px]">
                      {obs.sub_location || 'General Area'}
                    </span>
                  </td>

                  {/* Risk Level Badge */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isFatal
                          ? 'bg-rose-600 text-white'
                          : isSerious
                          ? 'bg-amber-500 text-slate-900'
                          : isMinor
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {obs.risk_level}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        obs.observation_status === 'Open'
                          ? 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                          : obs.observation_status === 'Overdue'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                      }`}
                    >
                      {obs.observation_status}
                    </span>
                  </td>

                  {/* Actions Count */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    {obs.has_actions ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {obs.actions_count} Action{obs.actions_count > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">
                        No actions
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
        <span className="text-slate-400">
          Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, data.total)} of {data.total.toLocaleString()}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition font-medium"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
            disabled={page >= data.total_pages}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition font-medium"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
