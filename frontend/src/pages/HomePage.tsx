import { useState } from 'react';
import { usePhotos } from '../hooks/usePhotos';
import PhotoGrid from '../components/PhotoGrid';
import PhotoModal from '../components/PhotoModal';
import ScanProgress from '../components/ScanProgress';
import type { Photo } from '../types';

export default function HomePage() {
  const { photos, loading, hasMore, loadMore } = usePhotos();
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const currentIndex = selectedPhoto
    ? photos.findIndex((p) => p.id === selectedPhoto.id)
    : -1;

  return (
    <div>
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 z-10 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">Photos</h2>
      </div>

      <PhotoGrid
        photos={photos}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onPhotoClick={setSelectedPhoto}
      />

      {selectedPhoto && (
        <PhotoModal
          photoId={selectedPhoto.id}
          onClose={() => setSelectedPhoto(null)}
          onPrev={
            currentIndex > 0
              ? () => setSelectedPhoto(photos[currentIndex - 1])
              : undefined
          }
          onNext={
            currentIndex < photos.length - 1
              ? () => setSelectedPhoto(photos[currentIndex + 1])
              : undefined
          }
        />
      )}

      <ScanProgress />
    </div>
  );
}
