'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { 
  Sparkles, 
  ShieldAlert, 
  Activity, 
  CheckCircle2, 
  Database,
  Flame,
  Repeat,
  FileSpreadsheet
} from 'lucide-react';

import { Header } from '../components/Header';
import { FilterBar } from '../components/FilterBar';
import { SummaryCards } from '../components/SummaryCards';
import { TrendSection } from '../components/TrendSection';
import { CategorySection } from '../components/CategorySection';
import { LocationSection } from '../components/LocationSection';
import { ActionsSection } from '../components/ActionsSection';
import { RepeatedObservations } from '../components/RepeatedObservations';
import { SeveritySection } from '../components/SeveritySection';
import { ObservationsTable } from '../components/ObservationsTable';
import { ObservationDrawer } from '../components/ObservationDrawer';
import { UploadModal } from '../components/UploadModal';

import {
  useSummaryKPIs,
  useTrend,
  useFilterOptions,
} from '../hooks/useDashboard';
import { DashboardFilters, ObservationItem } from '../lib/types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function DashboardContent() {
  const qc = useQueryClient();

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Active filters state
  const [filters, setFilters] = useState<DashboardFilters>({
    date_mode: 'occurrence',
  });

  // Active dataset ID state
  const [activeDatasetId, setActiveDatasetId] = useState<string | undefined>(undefined);

  // Selected observation for drawer
  const [selectedObservation, setSelectedObservation] = useState<ObservationItem | null>(null);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);

  // Filter options
  const { data: filterOptions } = useFilterOptions(activeDatasetId);

  // Top KPIs query
  const { data: summaryData, isLoading: isSummaryLoading, refetch: refetchSummary } = useSummaryKPIs(filters);

  // Trend query
  const { data: trendData, isLoading: isTrendLoading, refetch: refetchTrend } = useTrend(filters);

  // Toggle Dark Mode
  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleFilterChange = (newFilters: DashboardFilters) => {
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      dataset_id: activeDatasetId,
      date_mode: 'occurrence',
    });
  };

  const handleDatasetChanged = (datasetId: string) => {
    setActiveDatasetId(datasetId);
    setFilters((prev) => ({ ...prev, dataset_id: datasetId }));
    qc.invalidateQueries();
  };

  const handleUploadSuccess = (datasetId: string) => {
    handleDatasetChanged(datasetId);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors">
      {/* Top App Header */}
      <Header
        onOpenUpload={() => setIsUploadOpen(true)}
        activeDatasetId={activeDatasetId}
        onDatasetChanged={handleDatasetChanged}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dynamic Global Filter Bar */}
        <FilterBar
          filters={filters}
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
        />

        {/* Section 1: Top Summary KPI Cards */}
        <SummaryCards data={summaryData} isLoading={isSummaryLoading} />

        {/* Section 2: Week-Wise Trendline, WoW % & 2-3 Week Forecast */}
        <TrendSection data={trendData} isLoading={isTrendLoading} />

        {/* Section 3: By Category/Type (with drill-down) */}
        <CategorySection filters={filters} />

        {/* Section 4: By Location / Plant Unit (with drill-down) */}
        <LocationSection filters={filters} />

        {/* Section 5: Actions Assigned + Status Distribution (Unpivoted Child Records) */}
        <ActionsSection filters={filters} />

        {/* Section 6 & 7: Additional Value-Adds (Insights Section) */}
        <div className="my-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                Advanced Safety Intelligence & Insights
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Rule-based recurring hazard clustering, severity exposure ranking, and statistical risk projections.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Value-Add 1: Repeated Observations Insight */}
            <RepeatedObservations filters={filters} />

            {/* Value-Add 2: Severity Top 5 & Bottom 5 Insight */}
            <SeveritySection filters={filters} />
          </div>
        </div>

        {/* Section 8: Searchable Observations Master Table */}
        <div className="my-8">
          <ObservationsTable
            filters={filters}
            onSelectObservation={(obs) => setSelectedObservation(obs)}
          />
        </div>
      </main>

      {/* Observation Detail Slide-Over Drawer */}
      <ObservationDrawer
        observation={selectedObservation}
        onClose={() => setSelectedObservation(null)}
      />

      {/* File Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">SafeTrack EHS Platform</span>
            <span>•</span>
            <span>PostgreSQL &bull; Redis &bull; Kafka &bull; MinIO &bull; Next.js &bull; FastAPI</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Engineered for High-Reliability Enterprise Safety Intelligence
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Page() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  );
}
