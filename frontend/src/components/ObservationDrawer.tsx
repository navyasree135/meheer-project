'use client';

import React from 'react';
import { 
  X, 
  MapPin, 
  Layers, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Flame, 
  ShieldAlert, 
  UserCheck, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { ObservationItem } from '../lib/types';

interface ObservationDrawerProps {
  observation: ObservationItem | null;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-300 dark:border-sky-800',
  Overdue: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800',
  Completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
  Closed: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
  'In Progress': 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-800',
};

export const ObservationDrawer: React.FC<ObservationDrawerProps> = ({
  observation,
  onClose,
}) => {
  if (!observation) return null;

  const isFatal = observation.risk_level === 'Fatal';
  const isSerious = observation.risk_level === 'Serious';
  const isMinor = observation.risk_level === 'Minor';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-extrabold text-slate-900 dark:text-white">
                  {observation.observation_id}
                </span>
                {observation.has_suffix_s && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                    Flag -S
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">
                Logged #{observation.seq_no || observation.id} in dataset
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            {/* Badges strip: Risk & Status */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  isFatal
                    ? 'bg-rose-600 text-white'
                    : isSerious
                    ? 'bg-amber-500 text-slate-900'
                    : isMinor
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                Risk: {observation.risk_level}
              </span>

              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                  STATUS_COLORS[observation.observation_status] || 'bg-slate-100'
                }`}
              >
                Status: {observation.observation_status}
              </span>

              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Pair Present: {observation.pair_present ? 'Yes' : 'No'}
              </span>
            </div>

            {/* Description Card */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-sky-500" /> Observation Description
              </span>
              <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {observation.description || 'No description logged.'}
              </p>
            </div>

            {/* Hierarchy Splits: Type & Location */}
            <div className="grid grid-cols-1 gap-4">
              {/* Type Hierarchy */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" /> Type Hierarchy (Normalized)
                </span>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Category:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{observation.category}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Sub-Category:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{observation.sub_category || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Specific Detail:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-right truncate max-w-[220px]">
                      {observation.detail || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Location Hierarchy */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-sky-500" /> Location Hierarchy
                </span>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Plant Unit:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{observation.unit}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Sub-Location:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{observation.sub_location || 'General Area'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Exact Coordinates:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {observation.exact_location || <em className="text-slate-400 font-normal">None reported (normalized)</em>}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dates & Reporting Velocity */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Date & Reporting Velocity
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Occurred On:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{observation.occurrence_date}</span>
                  <span className="text-[10px] text-slate-400 block">{observation.occurrence_week_label}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Reported On:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{observation.reported_on || 'Same day'}</span>
                  <span className="text-[10px] text-indigo-500 font-semibold block">
                    {observation.reporting_lag_days} days lag
                  </span>
                </div>
              </div>
            </div>

            {/* Unpivoted Actions Child Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Corrective Actions Assigned ({observation.actions?.length || 0})
                </h3>
                <span className="text-[10px] text-slate-400">Unpivoted Child Records</span>
              </div>

              {observation.actions && observation.actions.length > 0 ? (
                <div className="space-y-3">
                  {observation.actions.map((act) => (
                    <div
                      key={act.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">
                          Action #{act.action_number}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            STATUS_COLORS[act.status] || 'bg-slate-100'
                          }`}
                        >
                          {act.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        {act.action_text}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100 dark:border-slate-700 text-slate-500">
                        <div>Due: {act.due_date || 'No due date'}</div>
                        <div>Closed: {act.closure_date || 'Not closed'}</div>
                      </div>

                      {act.remarks && (
                        <div className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg">
                          <strong>Remarks:</strong> {act.remarks}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">No corrective actions logged.</p>
                  {observation.reason_for_no_actions && (
                    <p className="mt-1 text-[11px] text-slate-500 italic">
                      Reason: "{observation.reason_for_no_actions}"
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Closed by: {observation.closed_by || 'Not closed (active)'}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
