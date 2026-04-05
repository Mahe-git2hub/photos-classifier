export interface Photo {
  id: number;
  file_path: string;
  filename: string;
  width: number | null;
  height: number | null;
  taken_at: string | null;
  scanned: boolean;
  face_count: number;
  created_at: string;
}

export interface Face {
  id: number;
  photo_id: number;
  person_id: number | null;
  person_name: string | null;
  bbox_x: number;
  bbox_y: number;
  bbox_w: number;
  bbox_h: number;
  confidence: number;
  review_status: string;
  best_match_score: number | null;
  skip_count: number;
}

export interface PhotoDetail extends Photo {
  faces: Face[];
}

export interface Person {
  id: number;
  name: string | null;
  face_count: number;
  representative_face_id: number | null;
  created_at: string;
}

export interface CandidatePerson {
  person_id: number;
  person_name: string | null;
  representative_face_thumbnail_url: string | null;
  similarity_score: number;
}

export interface AnnotationReview {
  face_id: number;
  face_thumbnail_url: string;
  review_type: 'pair_verify' | 'new_face';
  best_match_person_id: number | null;
  best_match_person_name: string | null;
  best_match_face_thumbnail_url: string | null;
  best_match_score: number | null;
  candidate_persons: CandidatePerson[];
}

export interface AnnotationStats {
  pending: number;
  skipped: number;
  confirmed: number;
  auto_assigned: number;
  total_faces: number;
}

export interface ScanStatus {
  is_scanning: boolean;
  phase: string;
  progress: number;
  total_photos: number;
  processed_photos: number;
  total_faces: number;
  message: string;
}
