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
  PieChart,
  Pie,
} from 'recharts';
import { 
  Layers, 
  ArrowLeft, 
  Flame, 
  CheckCircle, 
  AlertTriangle, 
  ChevronRight,
  PieChart as PieIcon,
  BarChart3
} from 'lucide-react';
import { useCategories } from '../hooks/useDashboard';
import { DashboardFilters } from '../lib/types';

interface CategorySectionProps {
  filters: DashboardFilters;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Unsafe Condition': '#f97316', // Orange
  'Unsafe Act': '#ef4444',       // Red
  'Best Practices': '#10b981',   // Emerald
  'QA - Observations': '#3b82f6',// Blue
  'LSR Violation': '#8b5cf6',    // Purple
  'Unclassified': '#94a3b8',
};

const DEFAULT_COLOR = '#0284c7';

export const CategorySection: React.FC<CategorySectionProps> = ({ filters }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewType, setViewType] = useState<'bar' | 'donut'>('bar');

  const { data, isLoading } = useCategories(filters, selectedCategory || undefined);

  if (isLoading || !data) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="h-6 w-48 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mb-4" />
        <div className="h-72 bg-slate-50 dark:bg-slate-800/60 rounded-xl animate-pulse" />
      </div>
    );
  }

  // Drilldown view for a specific category
  if (data.is_drilldown && selectedCategory) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-6 shadow-sm transition-colors">
        {/* Drilldown Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 bg-sky-50 dark:bg-sky-950/50 px-2.5 py-1 rounded-lg border border-sky-200 dark:border-sky-800 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Categories
              </button>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedCategory}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Sub-category breakdown and top detail hazards logged under <span className="font-semibold">{selectedCategory}</span> ({data.total_in_category} total).
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 self-start sm:self-auto">
            {data.total_in_category} Observations
          </span>
        </div>

        {/* Sub-Categories Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              Sub-Category Distribution
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.sub_categories}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.6} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    type="category"
                    dataKey="sub_category"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    width={110}
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
                    fill={CATEGORY_COLORS[selectedCategory] || DEFAULT_COLOR}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Details List */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                Top Specific Hazard Details
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {data.top_details?.map((d, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {d.detail}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">
                        {d.sub_category}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {d.fatal_count > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                          {d.fatal_count} Fatal
                        </span>
                      )}
                      {d.serious_count > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-900">
                          {d.serious_count} Serious
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        {d.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Top-Level Categories View
  const categoriesList = data.categories || [];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-6 shadow-sm transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              Observations by Category & Type
            </h2>
            <span className="text-xs text-slate-400 font-normal">
              (Click any category to drill down)
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Top-level classification distribution across Unsafe Conditions, Acts, Best Practices, QA, and LSR Violations.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setViewType('bar')}
            className={`p-1.5 rounded-md text-xs font-semibold ${
              viewType === 'bar'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewType('donut')}
            className={`p-1.5 rounded-md text-xs font-semibold ${
              viewType === 'donut'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <PieIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Column */}
        <div className="lg:col-span-2 h-72">
          <ResponsiveContainer width="100%" height="100%">
            {viewType === 'bar' ? (
              <BarChart
                data={categoriesList}
                margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
                onClick={(e) => {
                  if (e && e.activePayload && e.activePayload.length) {
                    const catName = e.activePayload[0].payload.category;
                    setSelectedCategory(catName);
                  }
                }}
                className="cursor-pointer"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  dy={10}
                />
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
                <Bar dataKey="count" name="Total Observations" radius={[6, 6, 0, 0]}>
                  {categoriesList.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CATEGORY_COLORS[entry.category] || DEFAULT_COLOR}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={categoriesList}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  onClick={(entry) => setSelectedCategory(entry.category)}
                  className="cursor-pointer"
                >
                  {categoriesList.map((entry, index) => (
                    <Cell
                      key={`cell-pie-${index}`}
                      fill={CATEGORY_COLORS[entry.category] || DEFAULT_COLOR}
                    />
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
            )}
          </ResponsiveContainer>
        </div>

        {/* Category Clickable Legend / Table */}
        <div className="flex flex-col justify-center space-y-2">
          {categoriesList.map((cat, i) => {
            const color = CATEGORY_COLORS[cat.category] || DEFAULT_COLOR;
            return (
              <button
                key={i}
                onClick={() => setSelectedCategory(cat.category)}
                className="group flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-sky-50/50 dark:hover:bg-slate-800 transition text-left text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="truncate">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-sky-600 dark:group-hover:text-sky-400 truncate">
                      {cat.category}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {cat.percentage}% of total
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {cat.count}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500 group-hover:translate-x-0.5 transition" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
