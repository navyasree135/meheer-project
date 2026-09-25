'use client';

import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  X, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Database, 
  Activity, 
  Sparkles,
  Server
} from 'lucide-react';
import { uploadObservationsFile } from '../lib/api';
import { useUploadProgress } from '../hooks/useUploadProgress';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (datasetId: string) => void;
}

const PIPELINE_STAGES = [
  { key: 'uploading', label: '1. Uploading File', desc: 'Sending payload over multipart HTTP stream' },
  { key: 's3', label: '2. Storing in S3 / MinIO', desc: 'Persisting original raw Excel/CSV file object' },
  { key: 'kafka', label: '3. Streaming to Kafka', desc: 'Publishing per-row event stream to topic safety.observations.raw' },
  { key: 'consumer', label: '4. Consuming & Ingesting', desc: 'Validating, unpivoting child actions & upserting into Postgres' },
  { key: 'ready', label: '5. Ready & Cache Warm', desc: 'Invalidating and caching rollups in Redis' },
];

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { status: jobStatus, isPolling } = useUploadProgress(jobId, () => {
    if (datasetId) {
      setTimeout(() => {
        onUploadSuccess(datasetId);
        handleClose();
      }, 1200);
    }
  });

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMsg(null);
    }
  };

  const handleStartUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setErrorMsg(null);
    setUploadPercent(10);

    try {
      const res = await uploadObservationsFile(selectedFile, (progressEvent) => {
        if (progressEvent.total) {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadPercent(Math.min(pct, 95));
        }
      });

      setDatasetId(res.dataset_id);
      setJobId(res.job_id);
    } catch (err: any) {
      console.error('Upload error:', err);
      setErrorMsg(err?.response?.data?.detail || 'Failed to upload file. Please ensure server is running.');
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setIsUploading(false);
    setJobId(null);
    setUploadPercent(0);
    setDatasetId(null);
    setErrorMsg(null);
    onClose();
  };

  // Determine active stage index
  let activeStageIdx = 0;
  if (isUploading && !jobId) {
    activeStageIdx = 0;
  } else if (jobStatus) {
    const stageStr = jobStatus.stage.toLowerCase();
    if (stageStr.includes('s3') || stageStr.includes('storing')) activeStageIdx = 1;
    else if (stageStr.includes('kafka') || stageStr.includes('publishing')) activeStageIdx = 2;
    else if (stageStr.includes('consuming') || stageStr.includes('ingesting') || stageStr.includes('parsing')) activeStageIdx = 3;
    else if (jobStatus.status === 'COMPLETED' || stageStr.includes('ready')) activeStageIdx = 4;
  }

  const overallPercent = jobStatus ? jobStatus.percent : uploadPercent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full p-6 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Ingest Safety Observations File
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                S3 Object Storage &rarr; Kafka Event Stream &rarr; Normalized Postgres Ingestion
              </p>
            </div>
          </div>

          {!isUploading && (
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="py-5">
          {!isUploading ? (
            /* File Selector Dropzone */
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-500 rounded-2xl p-8 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 hover:bg-sky-50/30 dark:hover:bg-slate-800/60 transition group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FileSpreadsheet className="w-12 h-12 text-slate-400 group-hover:text-sky-500 mx-auto mb-3 transition" />
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">
                  {selectedFile ? selectedFile.name : 'Click to select Observations.xlsx or .csv'}
                </span>
                <span className="text-xs text-slate-400 mt-1 block">
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB • Ready to stream`
                    : 'Supports .xlsx (sheet: observations) and .csv with 29 standard columns'}
                </span>
              </div>

              {errorMsg && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartUpload}
                  disabled={!selectedFile}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 disabled:pointer-events-none shadow-md shadow-sky-500/20 transition"
                >
                  Launch Streaming Pipeline
                </button>
              </div>
            </div>
          ) : (
            /* Live Stepper & Kafka Progress */
            <div className="space-y-5">
              {/* Progress Bar Header */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
                  <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-sky-500 animate-pulse" />
                    {jobStatus?.stage || 'Initializing Ingestion Pipeline...'}
                  </span>
                  <span className="text-sky-600 dark:text-sky-400 font-bold">
                    {overallPercent}%
                  </span>
                </div>

                {/* Progress bar line */}
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500 transition-all duration-300 rounded-full"
                    style={{ width: `${Math.max(5, overallPercent)}%` }}
                  />
                </div>

                {jobStatus && jobStatus.total_count > 0 && (
                  <div className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
                    <span>
                      Processed: <strong>{jobStatus.processed_count.toLocaleString()}</strong> of {jobStatus.total_count.toLocaleString()} rows
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">Job: {jobId}</span>
                  </div>
                )}
              </div>

              {/* 5-Step Pipeline Indicator */}
              <div className="space-y-2.5 pt-2">
                {PIPELINE_STAGES.map((stage, idx) => {
                  const isDone = activeStageIdx > idx || jobStatus?.status === 'COMPLETED';
                  const isCurrent = activeStageIdx === idx && jobStatus?.status !== 'COMPLETED';

                  return (
                    <div
                      key={stage.key}
                      className={`p-3 rounded-xl border text-xs flex items-center gap-3 transition ${
                        isCurrent
                          ? 'bg-sky-50/70 dark:bg-sky-950/30 border-sky-300 dark:border-sky-800'
                          : isDone
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60 text-slate-600 dark:text-slate-300'
                          : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : isCurrent ? (
                          <div className="w-4 h-4 rounded-full border-2 border-sky-600 border-t-transparent animate-spin" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] text-slate-400">
                            {idx + 1}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className={`font-bold ${isCurrent ? 'text-sky-700 dark:text-sky-300' : isDone ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>
                          {stage.label}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {stage.desc}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {jobStatus?.status === 'COMPLETED' && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 text-center font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pipeline Completed! Refreshing Dashboard...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
