import type { AnnotationReview } from '../types';

interface Props {
  review: AnnotationReview;
  onAction: (action: 'same' | 'different' | 'skip') => void;
}

export default function FaceVerifyCard({ review, onAction }: Props) {
  const similarity = review.best_match_score
    ? Math.round(review.best_match_score * 100)
    : null;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 max-w-lg mx-auto">
      <h3 className="text-center text-sm font-medium text-gray-500 mb-4">
        Are these the same person?
      </h3>

      <div className="flex items-center justify-center gap-6 mb-6">
        {/* Face to review */}
        <div className="text-center">
          <img
            src={review.face_thumbnail_url}
            alt="Face to review"
            className="w-28 h-28 rounded-full object-cover border-4 border-gray-200 mx-auto"
          />
          <p className="text-xs text-gray-400 mt-2">New face</p>
        </div>

        {/* VS indicator */}
        <div className="flex flex-col items-center">
          <span className="text-gray-300 text-lg font-bold">?</span>
          {similarity !== null && (
            <span className="text-xs text-gray-400 mt-1">{similarity}% match</span>
          )}
        </div>

        {/* Best match */}
        <div className="text-center">
          {review.best_match_face_thumbnail_url ? (
            <img
              src={review.best_match_face_thumbnail_url}
              alt="Best match"
              className="w-28 h-28 rounded-full object-cover border-4 border-blue-200 mx-auto"
            />
          ) : (
            <div className="w-28 h-28 rounded-full bg-gray-100 flex items-center justify-center mx-auto border-4 border-gray-200">
              <span className="text-gray-400 text-2xl">?</span>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">
            {review.best_match_person_name || `Person #${review.best_match_person_id}`}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => onAction('different')}
          className="flex-1 py-3 rounded-xl bg-red-50 text-red-600 font-medium text-sm hover:bg-red-100 transition-colors"
        >
          Different
        </button>
        <button
          onClick={() => onAction('skip')}
          className="flex-1 py-3 rounded-xl bg-gray-50 text-gray-500 font-medium text-sm hover:bg-gray-100 transition-colors"
        >
          Skip
        </button>
        <button
          onClick={() => onAction('same')}
          className="flex-1 py-3 rounded-xl bg-green-50 text-green-600 font-medium text-sm hover:bg-green-100 transition-colors"
        >
          Same
        </button>
      </div>

      <p className="text-center text-xs text-gray-300 mt-3">
        Keyboard: N = Different, S = Skip, Y = Same
      </p>
    </div>
  );
}
