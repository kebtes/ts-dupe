// src/api/useTrainingStructure.ts
//
// React hook exposing the real backend training structure with a module-level
// in-flight cache, so every consumer (app shell title, Module tab display,
// Content target selector) shares one request per training id.
//
// No offline fallback: when the request fails, consumers get a clear error
// and must not present mock records as backend data.

import { useCallback, useEffect, useRef, useState } from 'react';
import { getTrainingStructure } from './tabs';
import type { BackendTrainingStructure } from './adapters';

interface CacheEntry {
  promise: Promise<BackendTrainingStructure>;
}

const cache = new Map<string, CacheEntry>();

function cachedStructure(trainingId: string): Promise<BackendTrainingStructure> {
  let entry = cache.get(trainingId);
  if (!entry) {
    entry = { promise: getTrainingStructure(trainingId) };
    cache.set(trainingId, entry);
    // Drop failed entries so a later retry issues a fresh request.
    entry.promise.catch(() => {
      if (cache.get(trainingId) === entry) cache.delete(trainingId);
    });
  }
  return entry.promise;
}

/** Force a fresh request on the next mount/hook run (e.g. Retry button). */
export function invalidateTrainingStructure(trainingId?: string): void {
  if (trainingId) cache.delete(trainingId);
  else cache.clear();
}

export interface TrainingStructureState {
  structure: BackendTrainingStructure | null;
  loading: boolean;
  error: string | null;
  /** Request a fresh fetch (bypasses the shared cache). */
  retry: () => void;
}

export function useTrainingStructure(trainingId: string): TrainingStructureState {
  const [structure, setStructure] = useState<BackendTrainingStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    setLoading(true);
    setError(null);
    setStructure(null);
    invalidateTrainingStructure(trainingId); // fresh fetch per mount/attempt
    cachedStructure(trainingId)
      .then((result) => {
        if (aliveRef.current) setStructure(result);
      })
      .catch((err: unknown) => {
        if (aliveRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load the training structure.');
        }
      })
      .finally(() => {
        if (aliveRef.current) setLoading(false);
      });
    return () => {
      aliveRef.current = false;
    };
  }, [trainingId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { structure, loading, error, retry };
}
