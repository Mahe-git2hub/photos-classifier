import { useEffect, useState } from 'react';
import { getPhoto, getPhotoFullUrl, getFaceThumbnailUrl } from '../api/client';
import type { PhotoDetail, Face } from '../types';
import LabelDialog from './LabelDialog';

interface Props {
  photoId: number;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export default function PhotoModal({ photoId, onClose, onPrev, onNext }: Props) {
  const [detail, setDetail] = useState<PhotoDetail | null>(null);
  const [selectedFace, setSelectedFace] = useState<Face | null>(null);

  useEffect(() => {
    getPhoto(photoId).then(setDetail).catch(console.error);
  }, [photoId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
      if (e.key === 'ArrowRight' && onNext) onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onPrev, onNext]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white text-2xl"
        >
          &times;
        </button>

        {/* Navigation */}
        {onPrev && (
          <button
            onClick={onPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 text-white/70 hover:text-white text-3xl"
          >
            &#8249;
          </button>
        )}
        {onNext && (
          <button
            onClick={onNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 text-white/70 hover:text-white text-3xl"
          >
            &#8250;
          </button>
        )}

        {/* Image with face boxes */}
        <div className="relative">
          <img
            src={getPhotoFullUrl(photoId)}
            alt=""
            className="max-w-[90vw] max-h-[85vh] object-contain"
          />
          {detail?.faces.map((face) => (
            <div
              key={face.id}
              className="absolute border-2 border-blue-400 hover:border-blue-300 cursor-pointer rounded-sm transition-colors"
              style={{
                left: `${face.bbox_x * 100}%`,
                top: `${face.bbox_y * 100}%`,
                width: `${face.bbox_w * 100}%`,
                height: `${face.bbox_h * 100}%`,
              }}
              onClick={() => setSelectedFace(face)}
            >
              {face.person_name && (
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
                  {face.person_name}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Face strip */}
        {detail && detail.faces.length > 0 && (
          <div className="flex gap-2 mt-3 justify-center">
            {detail.faces.map((face) => (
              <div
                key={face.id}
                className={`w-10 h-10 rounded-full overflow-hidden cursor-pointer border-2 transition-colors ${
                  selectedFace?.id === face.id ? 'border-blue-400' : 'border-white/30'
                }`}
                onClick={() => setSelectedFace(face)}
              >
                <img
                  src={getFaceThumbnailUrl(face.id)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedFace && (
        <LabelDialog
          face={selectedFace}
          onClose={() => setSelectedFace(null)}
          onSaved={() => {
            setSelectedFace(null);
            getPhoto(photoId).then(setDetail);
          }}
        />
      )}
    </div>
  );
}
