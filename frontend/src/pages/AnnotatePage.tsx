import { useState, useEffect, useCallback } from 'react';
import {
  getPendingReviews,
  getAnnotationStats,
  verifyPair,
  resolveNewFace,
} from '../api/client';
import type { AnnotationReview, AnnotationStats } from '../types';
import FaceVerifyCard from '../components/FaceVerifyCard';
import NewFaceCard from '../components/NewFaceCard';

export default function AnnotatePage() {
  const [reviews, setReviews] = useState<AnnotationReview[]>([]);
  const [stats, setStats] = useState<AnnotationStats | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const [revs, st] = await Promise.all([
        getPendingReviews(20),
        getAnnotationStats(),
      ]);
      setReviews(revs);
      setStats(st);
      setCurrentIndex(0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const current = reviews[currentIndex];

  const advance = () => {
    if (currentIndex < reviews.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      loadReviews();
    }
  };

  const handlePairAction = async (action: 'same' | 'different' | 'skip') => {
    if (!current || !current.best_match_person_id) return;
    await verifyPair(current.face_id, current.best_match_person_id, action);
    advance();
  };

  const handleAssign = async (personId: number) => {
    if (!current) return;
    await resolveNewFace(current.face_id, 'assign', personId);
    advance();
  };

  const handleCreateNew = async (name?: string) => {
    if (!current) return;
    await resolveNewFace(current.face_id, 'create_new', undefined, name);
    advance();
  };

  const handleSkip = async () => {
    if (!current) return;
    await resolveNewFace(current.face_id, 'skip');
    advance();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!current) return;
      if (e.target instanceof HTMLInputElement) return;

      if (current.review_type === 'pair_verify') {
        if (e.key === 'y' || e.key === 'Y') handlePairAction('same');
        if (e.key === 'n' || e.key === 'N') handlePairAction('different');
        if (e.key === 's' || e.key === 'S') handlePairAction('skip');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const totalReviewable = (stats?.pending ?? 0) + (stats?.skipped ?? 0);
  const reviewed = currentIndex;

  return (
    <div>
      <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 z-10 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">Review Faces</h2>
        {stats && (
          <div className="flex gap-4 mt-1 text-xs text-gray-400">
            <span>{stats.auto_assigned} auto-assigned</span>
            <span>{stats.confirmed} confirmed</span>
            <span className="text-orange-500">{stats.pending} pending</span>
            <span>{stats.skipped} skipped</span>
          </div>
        )}
      </div>

      <div className="max-w-xl mx-auto py-12 px-4">
        {/* Progress bar */}
        {reviews.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{reviewed} reviewed</span>
              <span>{reviews.length} in queue</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(reviewed / Math.max(reviews.length, 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !current ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">All caught up!</p>
            <p className="text-sm text-gray-400 mt-1">No faces need review right now.</p>
          </div>
        ) : current.review_type === 'pair_verify' ? (
          <FaceVerifyCard review={current} onAction={handlePairAction} />
        ) : (
          <NewFaceCard
            review={current}
            onAssign={handleAssign}
            onCreateNew={handleCreateNew}
            onSkip={handleSkip}
          />
        )}
      </div>
    </div>
  );
}
