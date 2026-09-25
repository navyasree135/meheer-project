'use client';

import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ListOrdered, 
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { useActionsAnalysis } from '../hooks/useDashboard';
import { DashboardFilters } from '../lib/types';

interface ActionsSectionProps {
  filters: DashboardFilters;
}

const ACTION_STATUS_COLORS: Record<string, string> = {
  Open: '#3b82f6',        // Blue
  Overdue: '#ef4444',     // Red
  Completed: '#10b981',   // Emerald
  Closed: '#64748b',      // Slate
  'In Progress': '#8b5cf6', // Purple
};

export const ActionsSection: React.FC<ActionsSectionProps> = ({ filters }) => {
  const { data, isLoading } = useActionsAnalysis(filters);

  if (isLoading || !data) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="h-6 w-52 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mb-4" />
        <div className="h-72 bg-slate-50 dark:bg-slate-800/60 rounded-xl animate-pulse" />
      </div>
    );
  }

  const assignedPieData = [
    { name: 'Actions Assigned', value: data.observations_with_actions, color: '#10b981' },
    { name: 'No Actions Assigned', value: data.observations_without_actions, color: '#94a3b8' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-6 shadow-sm transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Corrective Actions Assignment & Status Distribution
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Normalized Child Table
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Breakdown of observations with ≥1 assigned corrective actions vs unassigned, and lifecycle status distribution across the unpivoted actions table ({data.total_actions_logged} total action rows).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Assigned vs Unassigned Donut + Reason for No Action */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Action Assignment Coverage
            </h3>
            
            <div className="flex items-center justify-between">
              <div className="h-44 w-44 relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assignedPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={68}
                      paddingAngle={3}
                    >
                      {assignedPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '0.75rem',
                        border: '1px solid #334155',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Percentage */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {data.with_actions_pct}%
                  </span>
                  <span className="text-[10px] text-slate-400">Assigned</span>
                </div>
              </div>

              {/* Legend & Stats */}
              <div className="space-y-3 flex-1 pl-4 text-xs">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      Actions Assigned
                    </span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {data.observations_with_actions}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {data.with_actions_pct}% of total observations
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                      No Action Assigned
                    </span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {data.observations_without_actions}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {data.without_actions_pct}% of total observations
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Reasons for No Action Logged */}
          {data.top_reasons_no_actions && data.top_reasons_no_actions.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                Top Reasons for No Action
              </h4>
              <div className="space-y-1">
                {data.top_reasons_no_actions.slice(0, 2).map((r, idx) => (
                  <div key={idx} className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                    <span className="truncate max-w-[280px]">"{r.reason}"</span>
                    <span className="font-bold text-slate-400 ml-2">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Status Distribution across Unpivoted Child Actions */}
        <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Unpivoted Action Status Distribution
              </h3>
              <span className="text-[10px] text-slate-400">
                {data.total_actions_logged} total child rows
              </span>
            </div>

            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.action_status_distribution}
                  margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '0.75rem',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" name="Actions Count" radius={[6, 6, 0, 0]}>
                    {data.action_status_distribution.map((entry, index) => (
                      <Cell
                        key={`act-cell-${index}`}
                        fill={ACTION_STATUS_COLORS[entry.status] || '#3b82f6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Action 1 / Action 2 / Action 3 sequence breakdown */}
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-around text-xs">
            {data.action_sequence_distribution?.map((seq) => (
              <div key={seq.action_number} className="text-center">
                <span className="text-[10px] text-slate-400 font-semibold block">{seq.label}</span>
                <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                  {seq.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
