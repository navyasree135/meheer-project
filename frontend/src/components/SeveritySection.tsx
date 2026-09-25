'use client';

import React, { useState } from 'react';
import { 
  Flame, 
  ShieldCheck, 
  AlertOctagon, 
  Sparkles, 
  TrendingUp, 
  Info,
  Building2,
  Layers
} from 'lucide-react';
import { useSeverity } from '../hooks/useDashboard';
import { DashboardFilters, SeverityCluster } from '../lib/types';

interface SeveritySectionProps {
  filters: DashboardFilters;
}

export const SeveritySection: React.FC<SeveritySectionProps> = ({ filters }) => {
  const [viewBy, setViewBy] = useState<'unit' | 'category'>('unit');
  const { data, isLoading } = useSeverity(filters);

  if (isLoading || !data) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="h-6 w-56 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mb-4" />
        <div className="h-64 bg-slate-50 dark:bg-slate-800/60 rounded-xl animate-pulse" />
      </div>
    );
  }

  const top5 = viewBy === 'unit' ? data.top_5_high_severity_units : data.top_5_high_severity_categories;
  const bottom5 = viewBy === 'unit' ? data.bottom_5_low_severity_units : data.bottom_5_low_severity_categories;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-6 shadow-sm transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-500" />
              High vs. Low Severity Clustering (Top 5 & Bottom 5)
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              Insight 2
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Comparative severity scoring weighting high-potential Fatal & Serious exposures vs safe operating areas.
          </p>
        </div>

        {/* View Switcher: Unit vs Category */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setViewBy('unit')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              viewBy === 'unit'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> By Plant Unit
          </button>
          <button
            onClick={() => setViewBy('category')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              viewBy === 'category'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> By Category
          </button>
        </div>
      </div>

      {/* Split Grid: Top 5 Highest Severity vs Bottom 5 Lowest Severity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Highest Severity Column */}
        <div className="bg-rose-50/30 dark:bg-rose-950/10 p-4 rounded-xl border border-rose-200/80 dark:border-rose-900/40">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-rose-200 dark:border-rose-900/60">
            <h3 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-rose-600" />
              Top 5 Highest Severity Clusters
            </h3>
            <span className="text-[10px] font-semibold text-rose-600 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-full">
              Highest Risk Exposure
            </span>
          </div>

          <div className="space-y-2.5">
            {top5.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-rose-200/60 dark:border-rose-900/40 shadow-sm text-xs flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="truncate">
                    <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {item.total_observations} total observations
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
                      Index: {item.severity_index}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {item.serious_fatal_pct}% High Risk
                    </div>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    {item.fatal_count > 0 && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-600 text-white">
                        {item.fatal_count} Fatal
                      </span>
                    )}
                    {item.serious_count > 0 && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-slate-900">
                        {item.serious_count} Serious
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom 5 Lowest Severity Column */}
        <div className="bg-emerald-50/30 dark:bg-emerald-950/10 p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-emerald-200 dark:border-emerald-900/60">
            <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Bottom 5 Lowest Severity Clusters
            </h3>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
              Lowest Severity / Safe Ops
            </span>
          </div>

          <div className="space-y-2.5">
            {bottom5.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-emerald-200/60 dark:border-emerald-900/40 shadow-sm text-xs flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="truncate">
                    <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {item.total_observations} total observations
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      Index: {item.severity_index}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {item.minor_count} Minor logged
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    {item.fatal_count === 0 ? '0 Fatal' : `${item.fatal_count} Fatal`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Methodology Caption */}
      <div className="mt-4 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/50">
        <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-semibold text-slate-700 dark:text-slate-200">Severity Methodology:</span>{' '}
          {data.scoring_methodology}
        </p>
      </div>
    </div>
  );
};
