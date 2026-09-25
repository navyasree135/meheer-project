'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import { 
  MapPin, 
  ArrowLeft, 
  ChevronRight, 
  Flame, 
  AlertCircle, 
  Building2,
  Navigation
} from 'lucide-react';
import { useLocations } from '../hooks/useDashboard';
import { DashboardFilters } from '../lib/types';

interface LocationSectionProps {
  filters: DashboardFilters;
}

export const LocationSection: React.FC<LocationSectionProps> = ({ filters }) => {
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);

  const { data, isLoading } = useLocations(filters, selectedUnit || undefined);

  if (isLoading || !data) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="h-6 w-48 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mb-4" />
        <div className="h-72 bg-slate-50 dark:bg-slate-800/60 rounded-xl animate-pulse" />
      </div>
    );
  }

  // Drilldown view for a specific Unit
  if (data.is_drilldown && selectedUnit) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-6 shadow-sm transition-colors">
        {/* Drilldown Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedUnit(null)}
                className="flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 bg-sky-50 dark:bg-sky-950/50 px-2.5 py-1 rounded-lg border border-sky-200 dark:border-sky-800 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Units
              </button>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-sky-500" />
                {selectedUnit} Sub-Locations & Hotspots
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Micro-location breakdown within {selectedUnit} ({data.total_in_unit} total observations logged).
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 self-start sm:self-auto">
            {data.total_in_unit} Observations
          </span>
        </div>

        {/* Sub-Locations Ranking & Exact Locations Hotspots */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sub-Location Bar Chart */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              Sub-Location Distribution
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.sub_locations}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.6} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    type="category"
                    dataKey="sub_location"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '0.75rem',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name="Observations"
                    fill="#0284c7"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Exact Location Hotspots */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-sky-500" />
                  Exact Location Hotspots
                </h3>
                <span className="text-[10px] text-slate-400">Nulls normalized</span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {data.exact_locations && data.exact_locations.length > 0 ? (
                  data.exact_locations.map((el, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          📍 {el.exact_location}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          in {el.sub_location}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0">
                        {el.count} logged
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-xs text-slate-400">
                    No specific sub-coordinates reported for this unit.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Top-Level Units View
  const unitsList = data.units || [];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-6 shadow-sm transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-sky-500" />
              Observations by Plant Unit & Location
            </h2>
            <span className="text-xs text-slate-400 font-normal">
              (Click any unit for sub-location drilldown)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Plant unit ranking by volume, open actions, and weighted severity risk index score.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Horizontal Bar Chart Column */}
        <div className="lg:col-span-2 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={unitsList}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
              onClick={(e) => {
                if (e && e.activePayload && e.activePayload.length) {
                  const unitName = e.activePayload[0].payload.unit;
                  setSelectedUnit(unitName);
                }
              }}
              className="cursor-pointer"
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.6} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis
                type="category"
                dataKey="unit"
                tick={{ fontSize: 11, fill: '#64748b' }}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '0.75rem',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" name="Total Observations" radius={[0, 6, 6, 0]}>
                {unitsList.map((entry, index) => {
                  const isTopUnit = index < 3;
                  return (
                    <Cell
                      key={`unit-cell-${index}`}
                      fill={isTopUnit ? '#0284c7' : '#38bdf8'}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Heat List Ranking Cards */}
        <div className="flex flex-col justify-center space-y-2 max-h-72 overflow-y-auto pr-1">
          {unitsList.map((unit, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedUnit(unit.unit)}
              className="group flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-sky-50/50 dark:hover:bg-slate-800 transition text-left text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded-md bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                  #{idx + 1}
                </span>
                <div className="truncate">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 truncate">
                    {unit.unit}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {unit.percentage}% • Score: {unit.risk_score}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {unit.fatal_count > 0 && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-600 text-white">
                    {unit.fatal_count} Fatal
                  </span>
                )}
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {unit.count}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
