import { useEffect, useRef, useCallback } from 'react';
import type { Photo } from '../types';
import PhotoCard from './PhotoCard';

interface Props {
  photos: Photo[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onPhotoClick: (photo: Photo) => void;
}

export default function PhotoGrid({ photos, loading, hasMore, onLoadMore, onPhotoClick }: Props) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        onLoadMore();
      }
    },
    [hasMore, loading, onLoadMore]
  );

  useEffect(() => {
    observerRef.current = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }
    return () => observerRef.current?.disconnect();
  }, [handleObserver]);

  // Group photos by date
  const grouped = groupByDate(photos);

  return (
    <div className="p-4">
      {grouped.map(([date, datePhotos]) => (
        <div key={date} className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2 px-1">{date}</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1">
            {datePhotos.map((photo) => (
              <PhotoCard key={photo.id} photo={photo} onClick={() => onPhotoClick(photo)} />
            ))}
          </div>
        </div>
      ))}

      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {photos.length === 0 && !loading && (
        <div className="text-center py-20 text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p>No photos yet. Go to Settings to scan a directory.</p>
        </div>
      )}

      <div ref={sentinelRef} className="h-4" />
    </div>
  );
}

function groupByDate(photos: Photo[]): [string, Photo[]][] {
  const groups: Record<string, Photo[]> = {};
  for (const photo of photos) {
    const date = photo.taken_at
      ? new Date(photo.taken_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Unknown Date';
    (groups[date] ??= []).push(photo);
  }
  return Object.entries(groups);
}
