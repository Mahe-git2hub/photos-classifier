import { useState } from 'react';
import type { AnnotationReview } from '../types';

interface Props {
  review: AnnotationReview;
  onAssign: (personId: number) => void;
  onCreateNew: (name?: string) => void;
  onSkip: () => void;
}

export default function NewFaceCard({ review, onAssign, onCreateNew, onSkip }: Props) {
  const [showNameInput, setShowNameInput] = useState(false);
  const [name, setName] = useState('');

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 max-w-lg mx-auto">
      <h3 className="text-center text-sm font-medium text-gray-500 mb-4">
        New face detected
      </h3>

      {/* Face to review */}
      <div className="text-center mb-6">
        <img
          src={review.face_thumbnail_url}
          alt="New face"
          className="w-32 h-32 rounded-full object-cover border-4 border-orange-200 mx-auto"
        />
      </div>

      {/* Candidate matches */}
      {review.candidate_persons.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2 text-center">Could this be one of these people?</p>
          <div className="space-y-2">
            {review.candidate_persons.map((c) => (
              <button
                key={c.person_id}
                onClick={() => onAssign(c.person_id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors"
              >
                {c.representative_face_thumbnail_url ? (
                  <img
                    src={c.representative_face_thumbnail_url}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100" />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {c.person_name || `Person #${c.person_id}`}
                </span>
                <span className="ml-auto text-xs text-gray-400">
                  {Math.round(c.similarity_score * 100)}%
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create new or skip */}
      {showNameInput ? (
        <div className="space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name (optional)..."
            className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && onCreateNew(name || undefined)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowNameInput(false)}
              className="flex-1 py-2.5 rounded-xl bg-gray-50 text-gray-500 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => onCreateNew(name || undefined)}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              Create Person
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            className="flex-1 py-3 rounded-xl bg-gray-50 text-gray-500 font-medium text-sm hover:bg-gray-100"
          >
            Skip for now
          </button>
          <button
            onClick={() => setShowNameInput(true)}
            className="flex-1 py-3 rounded-xl bg-blue-50 text-blue-600 font-medium text-sm hover:bg-blue-100"
          >
            New person
          </button>
        </div>
      )}
    </div>
  );
}
