import { useState, useCallback } from 'react';
import type { ScannedReceiptData } from './useReceiptScanner';

interface CacheEntry {
  data: ScannedReceiptData;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function fileHash(file: File): string {
  const str = `${file.name}-${file.size}-${file.lastModified}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return hash.toString(36);
}

export function useReceiptCache() {
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map());

  const get = useCallback((file: File): ScannedReceiptData | null => {
    const key = fileHash(file);
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_DURATION) {
      setCache((prev) => {
        const next = new Map(prev);
        next.delete(key);
        return next;
      });
      return null;
    }
    return entry.data;
  }, [cache]);

  const set = useCallback((file: File, data: ScannedReceiptData) => {
    const key = fileHash(file);
    setCache((prev) => {
      const next = new Map(prev);
      next.set(key, { data, timestamp: Date.now() });
      return next;
    });
  }, []);

  const clear = useCallback(() => setCache(new Map()), []);

  return { get, set, clear };
}
