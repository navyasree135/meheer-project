'use client';

import React from 'react';
import { 
  Filter, 
  RotateCcw, 
  Search, 
  Calendar, 
  SlidersHorizontal, 
  AlertTriangle, 
  Users, 
  CheckCircle, 
  Clock 
} from 'lucide-react';
import { DashboardFilters, FilterOptions, DateMode } from '../lib/types';

interface FilterBarProps {
  filters: DashboardFilters;
  filterOptions?: FilterOptions;
  onFilterChange: (newFilters: DashboardFilters) => void;
  onResetFilters: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  filterOptions,
  onFilterChange,
  onResetFilters,
}) => {
  const activeCount = [
    filters.units && filters.units.length > 0,
    filters.categories && filters.categories.length > 0,
    filters.risk_levels && filters.risk_levels.length > 0,
    filters.observation_statuses && filters.observation_statuses.length > 0,
    filters.pair_present !== undefined,
    filters.start_date || filters.end_date,
    filters.search,
    filters.date_mode === 'reported',
  ].filter(Boolean).length;

  const handleDateModeToggle = (mode: DateMode) => {
    onFilterChange({ ...filters, date_mode: mode });
  };

  const handleRiskToggle = (risk: string) => {
    const current = filters.risk_levels || [];
    const updated = current.includes(risk)
      ? current.filter((r) => r !== risk)
      : [...current, risk];
    onFilterChange({ ...filters, risk_levels: updated.length > 0 ? updated : undefined });
  };

  const handleStatusToggle = (status: string) => {
    const current = filters.observation_statuses || [];
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onFilterChange({ ...filters, observation_statuses: updated.length > 0 ? updated : undefined });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 mb-6 transition-colors">
      <div className="flex flex-col gap-4">
        {/* Top row: Date Mode, Date range, Search, Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Occurrence vs Reported Date Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => handleDateModeToggle('occurrence')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filters.date_mode !== 'reported'
                  ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              📅 By Occurrence Date
            </button>
            <button
              onClick={() => handleDateModeToggle('reported')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filters.date_mode === 'reported'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              ⚡ By Reported Date
            </button>
          </div>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 absolute -top-2 left-2 px-1 bg-white dark:bg-slate-900">
                From
              </span>
              <input
                type="date"
                value={filters.start_date || ''}
                onChange={(e) => onFilterChange({ ...filters, start_date: e.target.value || undefined })}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <span className="text-slate-400 text-xs">to</span>
            <div className="relative">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 absolute -top-2 left-2 px-1 bg-white dark:bg-slate-900">
                To
              </span>
              <input
                type="date"
                value={filters.end_date || ''}
                onChange={(e) => onFilterChange({ ...filters, end_date: e.target.value || undefined })}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Search box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search description, hazard, location..."
              value={filters.search || ''}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value || undefined })}
              className="w-full text-xs pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Reset Filters */}
          {activeCount > 0 && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset ({activeCount})</span>
            </button>
          )}
        </div>

        {/* Bottom row: Dropdowns & Chips for Unit, Category, Risk, Status, Pair Present */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          {/* Unit selector */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Unit:</span>
            <select
              aria-label="Filter by Plant Unit"
              value={filters.units?.[0] || ''}
              onChange={(e) => {
                const val = e.target.value;
                onFilterChange({ ...filters, units: val ? [val] : undefined });
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">All Units</option>
              {filterOptions?.units?.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Category selector */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Category:</span>
            <select
              aria-label="Filter by Category"
              value={filters.categories?.[0] || ''}
              onChange={(e) => {
                const val = e.target.value;
                onFilterChange({ ...filters, categories: val ? [val] : undefined });
              }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-500 max-w-[160px] truncate"
            >
              <option value="">All Categories</option>
              {filterOptions?.categories?.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Risk Level Chips */}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-slate-500 dark:text-slate-400 font-medium mr-1">Risk:</span>
            {[
              { key: 'Fatal', label: 'Fatal', bgActive: 'bg-rose-600 text-white', bgInactive: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800' },
              { key: 'Serious', label: 'Serious', bgActive: 'bg-amber-600 text-white', bgInactive: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
              { key: 'Minor', label: 'Minor', bgActive: 'bg-yellow-500 text-slate-900', bgInactive: 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' },
              { key: 'Unclassified', label: 'Unclassified', bgActive: 'bg-slate-600 text-white', bgInactive: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700' },
            ].map((r) => {
              const isSelected = filters.risk_levels?.includes(r.key);
              return (
                <button
                  key={r.key}
                  onClick={() => handleRiskToggle(r.key)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition ${
                    isSelected ? r.bgActive : r.bgInactive
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          {/* Status Chips */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 dark:text-slate-400 font-medium mr-1">Status:</span>
            {['Open', 'Overdue', 'In Progress'].map((s) => {
              const isSelected = filters.observation_statuses?.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => handleStatusToggle(s)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition ${
                    isSelected
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>

          {/* Pair Present Toggle */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const nextVal = filters.pair_present === undefined ? true : filters.pair_present ? false : undefined;
                onFilterChange({ ...filters, pair_present: nextVal });
              }}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border transition ${
                filters.pair_present === true
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : filters.pair_present === false
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>
                Pair: {filters.pair_present === true ? 'Yes' : filters.pair_present === false ? 'No' : 'All'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
