'use client';

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  UploadCloud, 
  Sparkles, 
  Database, 
  Layers, 
  Sun, 
  Moon, 
  CheckCircle2, 
  RefreshCw,
  Activity
} from 'lucide-react';
import { useDatasets } from '../hooks/useDashboard';
import { activateDataset, seedSampleData } from '../lib/api';

interface HeaderProps {
  onOpenUpload: () => void;
  activeDatasetId?: string;
  onDatasetChanged: (id: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenUpload,
  activeDatasetId,
  onDatasetChanged,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const { data: datasets, refetch: refetchDatasets } = useDatasets();
  const [isSeeding, setIsSeeding] = useState(false);

  const activeDataset = datasets?.find((d) => d.id === activeDatasetId) || datasets?.find((d) => d.is_active);

  const handleSelectDataset = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (!selectedId) return;
    try {
      await activateDataset(selectedId);
      refetchDatasets();
      onDatasetChanged(selectedId);
    } catch (err) {
      console.error('Error activating dataset:', err);
    }
  };

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await seedSampleData();
      refetchDatasets();
      if (res.dataset_id) {
        onDatasetChanged(res.dataset_id);
      }
    } catch (err) {
      console.error('Error seeding demo data:', err);
    } finally {
      setTimeout(() => setIsSeeding(false), 1500);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  SafeTrack EHS Intelligence
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                  <Activity className="w-3 h-3 mr-1 animate-pulse text-sky-500" />
                  Live Event Stream
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                August 2026 Safety Observations Analytics & Corrective Actions Platform
              </p>
            </div>
          </div>

          {/* Controls & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dataset Selector */}
            <div className="hidden md:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/60">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Select Active Dataset"
                value={activeDataset?.id || ''}
                onChange={handleSelectDataset}
                className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[170px] truncate"
              >
                {datasets && datasets.length > 0 ? (
                  datasets.map((d) => (
                    <option key={d.id} value={d.id} className="dark:bg-slate-800">
                      {d.filename} ({d.row_count} rows)
                    </option>
                  ))
                ) : (
                  <option value="">Observations.xlsx (1,974 rows)</option>
                )}
              </select>
            </div>

            {/* Quick Demo Seed Button */}
            <button
              onClick={handleSeedDemo}
              disabled={isSeeding}
              title="Reload sample dataset through streaming pipeline"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-500 ${isSeeding ? 'animate-spin' : ''}`} />
              <span>{isSeeding ? 'Streaming...' : 'Load Sample (1,974)'}</span>
            </button>

            {/* Upload Button */}
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-sm shadow-sky-500/25 transition active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload .xlsx</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={onToggleDarkMode}
              title="Toggle theme"
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
