'use client';

import React, { useState } from 'react';
import { 
  Repeat, 
  AlertTriangle, 
  Flame, 
  ShieldAlert, 
  Sparkles, 
  Calendar, 
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useRepeats } from '../hooks/useDashboard';
import { DashboardFilters, RepeatCluster } from '../lib/types';

interface RepeatedObservationsProps {
  filters: DashboardFilters;
  onSelectCluster?: (cluster: RepeatCluster) => void;
}

export const RepeatedObservations: React.FC<RepeatedObservationsProps> = ({
  filters,
  onSelectCluster,
}) => {
  const { data, isLoading } = useRepeats(filters);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading || !data) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="h-6 w-56 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mb-4" />
        <div className="h-64 bg-slate-50 dark:bg-slate-800/60 rounded-xl animate-pulse" />
      </div>
    );
  }

  const clusters = data.clusters || [];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-6 shadow-sm transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Repeat className="w-5 h-5 text-amber-500" />
              Repeated Hazard Recurrence & Repeat Clusters
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              Insight 1
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Systemic recurrence engine identifying chronic hazards occurring ≥ 2 times across same unit and sub-category.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-bold text-slate-900 dark:text-white block">
              {data.total_repeat_clusters} Recurring Clusters
            </span>
            <span className="text-[10px] text-slate-400">
              {data.total_repeated_observations} repeated observations ({data.repeated_obs_percentage}% of total)
            </span>
          </div>
        </div>
      </div>

      {/* Detection Rule Explanation Banner */}
      <div className="mb-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 p-3 rounded-r-xl text-xs text-slate-700 dark:text-slate-300">
        <span className="font-bold text-amber-600 dark:text-amber-400">Repeat Detection Rule:</span>{' '}
        {data.detection_rule}
      </div>

      {/* Clusters List */}
      <div className="space-y-3">
        {clusters.slice(0, 6).map((cluster) => {
          const isExpanded = expandedId === cluster.id;
          const isCritical = cluster.recurrence_severity === 'Critical';
          const isHigh = cluster.recurrence_severity === 'High';

          return (
            <div
              key={cluster.id}
              className={`p-4 rounded-xl border transition-all ${
                isCritical
                  ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 hover:border-rose-400'
                  : isHigh
                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 hover:border-amber-400'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700 hover:border-slate-400'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                      {cluster.unit}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {cluster.category} &rsaquo; {cluster.sub_category}
                    </span>
                    <span
                      className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        isCritical
                          ? 'bg-rose-600 text-white'
                          : isHigh
                          ? 'bg-amber-500 text-slate-900'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {cluster.recurrence_severity} Recurrence
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {cluster.detail}
                  </h3>

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>
                      Repeated: <strong className="text-slate-800 dark:text-slate-200 font-bold">{cluster.repeat_count} times</strong>
                    </span>
                    {cluster.fatal_count > 0 && (
                      <span className="text-rose-600 font-bold">
                        🔥 {cluster.fatal_count} Fatal
                      </span>
                    )}
                    {cluster.serious_count > 0 && (
                      <span className="text-amber-600 font-bold">
                        ⚠️ {cluster.serious_count} Serious
                      </span>
                    )}
                    <span>
                      First: {cluster.first_seen} | Last: {cluster.last_seen}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Risk Priority</div>
                  <div className="text-base font-extrabold text-slate-900 dark:text-white">
                    {cluster.priority_score}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
