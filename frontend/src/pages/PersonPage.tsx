import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePhotos } from '../hooks/usePhotos';
import { usePersons } from '../hooks/usePersons';
import PhotoGrid from '../components/PhotoGrid';
import PhotoModal from '../components/PhotoModal';
import { getFaceThumbnailUrl, updatePerson } from '../api/client';
import type { Photo } from '../types';

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const personId = Number(id);
  const navigate = useNavigate();
  const { photos, loading, hasMore, loadMore } = usePhotos(personId);
  const { persons } = usePersons();
  const person = persons.find((p) => p.id === personId);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  const currentIndex = selectedPhoto
    ? photos.findIndex((p) => p.id === selectedPhoto.id)
    : -1;

  const handleRename = async () => {
    if (name.trim()) {
      await updatePerson(personId, name.trim());
      setEditing(false);
    }
  };

  return (
    <div>
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 z-10 px-6 py-4">
        <button
          onClick={() => navigate('/people')}
          className="text-sm text-gray-400 hover:text-gray-600 mb-1 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          People
        </button>
        <div className="flex items-center gap-3">
          {person?.representative_face_id && (
            <img
              src={getFaceThumbnailUrl(person.representative_face_id)}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
          )}
          {editing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              className="text-xl font-semibold border-b-2 border-blue-500 focus:outline-none"
              autoFocus
            />
          ) : (
            <h2
              className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
              onClick={() => {
                setEditing(true);
                setName(person?.name || '');
              }}
            >
              {person?.name || `Unknown #${personId}`}
            </h2>
          )}
          <span className="text-sm text-gray-400">{photos.length} photos</span>
        </div>
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
    </div>
  );
}
