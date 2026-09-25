'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Sparkles, 
  HelpCircle, 
  Info,
  CalendarDays 
} from 'lucide-react';
import { TrendResponse, TrendPoint } from '../lib/types';

interface TrendSectionProps {
  data?: TrendResponse;
  isLoading: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const pData: TrendPoint = payload[0]?.payload;
    const isForecast = pData?.is_projection;

    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700 rounded-xl p-3 shadow-xl text-xs max-w-xs">
        <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-1.5 mb-2">
          <span className="font-bold text-sky-400">{label}</span>
          {isForecast ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Projection
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
              Historical Actual
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          {!isForecast ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Logged:</span>
                <span className="font-extrabold text-white">{pData.count} obs</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Serious/Fatal:</span>
                <span className="font-bold text-rose-400">{pData.serious_fatal_count}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Forecast Velocity:</span>
                <span className="font-extrabold text-amber-400">{pData.projected_count} obs (est)</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">95% Conf. Range:</span>
                <span className="text-slate-300">{pData.lower_bound} – {pData.upper_bound}</span>
              </div>
            </>
          )}

          {pData.wow_pct !== null && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <span className="text-slate-400">Week-on-Week:</span>
              <span
                className={`font-bold ${
                  pData.wow_pct > 0 ? 'text-rose-400' : pData.wow_pct < 0 ? 'text-emerald-400' : 'text-slate-300'
                }`}
              >
                {pData.wow_pct > 0 ? `+${pData.wow_pct}%` : `${pData.wow_pct}%`}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const TrendSection: React.FC<TrendSectionProps> = ({ data, isLoading }) => {
  const [showConfidence, setShowConfidence] = useState(true);

  if (isLoading || !data) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="h-6 w-56 bg-slate-100 dark:bg-slate-800 rounded animate-pulse mb-4" />
        <div className="h-80 bg-slate-50 dark:bg-slate-800/60 rounded-xl animate-pulse" />
      </div>
    );
  }

  const chartData = data.combined_series;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-6 shadow-sm transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sky-500" />
              Week-Wise Trendline & Predictive Trajectory
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              {data.date_mode === 'reported' ? 'Reported Date' : 'Occurrence Date'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Weekly observation velocity across August & September with Week-on-Week % change and next 3-week predictive projection.
          </p>
        </div>

        {/* Legend / Toggle */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setShowConfidence(!showConfidence)}
            className={`px-2.5 py-1 rounded-lg font-medium border transition ${
              showConfidence
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
            95% Forecast Bounds
          </button>
        </div>
      </div>

      {/* Main Chart */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 25 }}>
            <defs>
              <linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
            
            <XAxis
              dataKey="week_label"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              dy={10}
            />
            
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Historical Observation Area */}
            <Area
              type="monotone"
              dataKey="count"
              name="Historical Actuals"
              stroke="#0284c7"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#historicalGradient)"
              dot={{ r: 4, fill: '#0284c7', strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 6, fill: '#0369a1', strokeWidth: 2, stroke: '#ffffff' }}
            />

            {/* Forecast Projection Line (Dashed) */}
            <Line
              type="monotone"
              dataKey="projected_count"
              name="Forecast Velocity"
              stroke="#f59e0b"
              strokeWidth={3}
              strokeDasharray="6 6"
              dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 6, fill: '#d97706', strokeWidth: 2, stroke: '#ffffff' }}
            />

            {/* Upper & Lower Confidence Interval Area */}
            {showConfidence && (
              <Area
                type="monotone"
                dataKey="upper_bound"
                name="Upper Bound (95%)"
                stroke="transparent"
                fill="url(#forecastGradient)"
                fillOpacity={0.2}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Week-on-Week % Change Badge Strip */}
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 block">
          Week-on-Week (% Change Rate)
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2">
          {chartData.map((item, idx) => {
            const wow = item.wow_pct;
            const isProjection = item.is_projection;

            return (
              <div
                key={idx}
                className={`p-2 rounded-xl border text-center transition ${
                  isProjection
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60'
                }`}
              >
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                  {item.week_label.replace('Week of ', '')}
                </div>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {isProjection ? `${item.projected_count} (est)` : item.count}
                </div>
                <div className="mt-1">
                  {wow === null ? (
                    <span className="inline-flex items-center text-[10px] font-semibold text-slate-400">
                      <Minus className="w-2.5 h-2.5 mr-0.5" /> Baseline
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                        wow > 0
                          ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50'
                          : wow < 0
                          ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50'
                          : 'text-slate-500 bg-slate-100'
                      }`}
                    >
                      {wow > 0 ? (
                        <TrendingUp className="w-2.5 h-2.5 mr-0.5" />
                      ) : (
                        <TrendingDown className="w-2.5 h-2.5 mr-0.5" />
                      )}
                      {wow > 0 ? `+${wow}%` : `${wow}%`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Forecast Disclaimer Caption */}
      <div className="mt-4 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/50">
        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <span className="font-semibold text-slate-700 dark:text-slate-200">Statistical Projection Note:</span>{' '}
          {data.forecast_disclaimer}
        </p>
      </div>
    </div>
  );
};
