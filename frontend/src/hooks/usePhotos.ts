import { useState, useEffect, useCallback } from 'react';
import { getPhotos } from '../api/client';
import type { Photo } from '../types';

export function usePhotos(personId?: number) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadPhotos = useCallback(async (pageNum: number, append = false) => {
    setLoading(true);
    try {
      const data = await getPhotos(pageNum, 50, personId);
      if (append) {
        setPhotos(prev => [...prev, ...data]);
      } else {
        setPhotos(data);
      }
      setHasMore(data.length === 50);
    } catch (err) {
      console.error('Failed to load photos:', err);
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    setPage(1);
    loadPhotos(1);
  }, [loadPhotos]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const next = page + 1;
      setPage(next);
      loadPhotos(next, true);
    }
  }, [loading, hasMore, page, loadPhotos]);

  const refresh = useCallback(() => {
    setPage(1);
    loadPhotos(1);
  }, [loadPhotos]);

  return { photos, loading, hasMore, loadMore, refresh };
}
