import { useState } from 'react';
import { getPhotoThumbnailUrl } from '../api/client';
import type { Photo } from '../types';

interface Props {
  photo: Photo;
  onClick: () => void;
}

export default function PhotoCard({ photo, onClick }: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className="relative aspect-square cursor-pointer overflow-hidden rounded-sm bg-gray-100 group"
      onClick={onClick}
    >
      <img
        src={getPhotoThumbnailUrl(photo.id)}
        alt={photo.filename}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          loaded ? 'opacity-100' : 'opacity-0'
        } group-hover:brightness-90`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
      />
      {photo.face_count > 0 && (
        <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-full">
          {photo.face_count}
        </div>
      )}
    </div>
  );
}
