'use client';

import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from './api';

export interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
  setData: (data: T) => void;
}

/** Runs `fetcher` whenever `key` changes and tracks loading/error state. */
export function useApi<T>(key: string, fetcher: () => Promise<T>): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures the fetcher's inputs
  const run = useCallback(fetcher, [key]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    run()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [run, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, loading, reload, setData };
}
