import { useState, useEffect } from 'react';
import { fetchJobStatus } from '../lib/api';
import { JobStatusResponse } from '../lib/types';

export function useUploadProgress(jobId: string | null, onComplete?: () => void) {
  const [status, setStatus] = useState<JobStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  useEffect(() => {
    if (!jobId) {
      setStatus(null);
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    let isCancelled = false;

    const poll = async () => {
      try {
        const data = await fetchJobStatus(jobId);
        if (isCancelled) return;
        setStatus(data);

        if (data.status === 'COMPLETED') {
          setIsPolling(false);
          if (onComplete) onComplete();
        } else if (data.status === 'FAILED') {
          setIsPolling(false);
        }
      } catch (err) {
        console.error('Error polling job status:', err);
      }
    };

    poll();
    const interval = setInterval(poll, 750);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [jobId, onComplete]);

  return { status, isPolling };
}
