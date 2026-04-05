import axios from 'axios';
import type {
  Photo,
  PhotoDetail,
  Person,
  AnnotationReview,
  AnnotationStats,
  ScanStatus,
} from '../types';

const api = axios.create({ baseURL: '/api' });

// Photos
export const getPhotos = (page = 1, perPage = 50, personId?: number) =>
  api.get<Photo[]>('/photos', { params: { page, per_page: perPage, person_id: personId } }).then(r => r.data);

export const getPhoto = (id: number) =>
  api.get<PhotoDetail>(`/photos/${id}`).then(r => r.data);

export const getPhotoThumbnailUrl = (id: number) => `/api/photos/${id}/thumbnail`;
export const getPhotoFullUrl = (id: number) => `/api/photos/${id}/full`;
export const getFaceThumbnailUrl = (id: number) => `/api/faces/${id}/thumbnail`;

// Persons
export const getPersons = () =>
  api.get<Person[]>('/persons').then(r => r.data);

export const updatePerson = (id: number, name: string) =>
  api.put<Person>(`/persons/${id}`, { name }).then(r => r.data);

export const mergePersons = (personIds: number[]) =>
  api.post<Person>('/persons/merge', { person_ids: personIds }).then(r => r.data);

export const deletePerson = (id: number) =>
  api.delete(`/persons/${id}`).then(r => r.data);

// Faces
export const assignFace = (faceId: number, personId: number) =>
  api.put(`/faces/${faceId}/assign`, { person_id: personId }).then(r => r.data);

export const createPersonFromFace = (faceId: number, name?: string) =>
  api.post(`/faces/${faceId}/new-person`, null, { params: { name } }).then(r => r.data);

// Annotations
export const getPendingReviews = (limit = 10) =>
  api.get<AnnotationReview[]>('/annotations/pending', { params: { limit } }).then(r => r.data);

export const getAnnotationStats = () =>
  api.get<AnnotationStats>('/annotations/stats').then(r => r.data);

export const verifyPair = (faceId: number, personId: number, action: 'same' | 'different' | 'skip') =>
  api.post('/annotations/verify-pair', { face_id: faceId, person_id: personId, action }).then(r => r.data);

export const resolveNewFace = (faceId: number, action: 'assign' | 'create_new' | 'skip', personId?: number, name?: string) =>
  api.post('/annotations/resolve-new', { face_id: faceId, action, person_id: personId, name }).then(r => r.data);

// Scan
export const startScan = (directoryPath: string) =>
  api.post('/scan/start', { directory_path: directoryPath }).then(r => r.data);

export const getScanStatus = () =>
  api.get<ScanStatus>('/scan/status').then(r => r.data);
