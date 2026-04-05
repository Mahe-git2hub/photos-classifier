import numpy as np
from sqlalchemy.orm import Session

from app.config import (
    CLUSTERING_SIMILARITY_THRESHOLD,
    CLUSTERING_ITERATIONS,
    HIGH_CONFIDENCE_THRESHOLD,
    MEDIUM_CONFIDENCE_THRESHOLD,
)
from app.models import Face, Person


def chinese_whispers(
    embeddings: np.ndarray,
    threshold: float = CLUSTERING_SIMILARITY_THRESHOLD,
    iterations: int = CLUSTERING_ITERATIONS,
) -> list[int]:
    n = len(embeddings)
    if n == 0:
        return []

    # Normalize embeddings for cosine similarity
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    norms[norms == 0] = 1
    normalized = embeddings / norms

    # Precompute similarity matrix
    similarities = np.dot(normalized, normalized.T)

    labels = list(range(n))

    for _ in range(iterations):
        order = np.random.permutation(n)
        changed = False
        for i in order:
            neighbors = np.where(similarities[i] > threshold)[0]
            if len(neighbors) <= 1:
                continue

            label_weights: dict[int, float] = {}
            for j in neighbors:
                if j == i:
                    continue
                lbl = labels[j]
                label_weights[lbl] = label_weights.get(lbl, 0) + similarities[i][j]

            if not label_weights:
                continue

            best_label = max(label_weights, key=label_weights.get)
            if labels[i] != best_label:
                labels[i] = best_label
                changed = True

        if not changed:
            break

    return labels


def cluster_faces(db: Session, progress_callback=None):
    faces = db.query(Face).all()
    if not faces:
        return 0

    if progress_callback:
        progress_callback("clustering", 0, 1, "Loading face embeddings...")

    # Load embeddings
    embeddings = []
    face_ids = []
    for face in faces:
        emb = np.frombuffer(face.embedding, dtype=np.float32)
        embeddings.append(emb)
        face_ids.append(face.id)

    embeddings_array = np.array(embeddings)

    if progress_callback:
        progress_callback("clustering", 0, 1, f"Clustering {len(embeddings)} faces...")

    # Run Chinese Whispers
    labels = chinese_whispers(embeddings_array)

    # Group faces by cluster label
    clusters: dict[int, list[int]] = {}
    for face_id, label in zip(face_ids, labels):
        clusters.setdefault(label, []).append(face_id)

    # Clear existing person assignments (for re-clustering)
    db.query(Person).delete()
    for face in faces:
        face.person_id = None
        face.review_status = "pending"
        face.best_match_person_id = None
        face.best_match_score = None

    # Create persons for each cluster
    person_count = 0
    face_map = {f.id: f for f in faces}
    emb_map = dict(zip(face_ids, embeddings))

    for cluster_label, cluster_face_ids in clusters.items():
        cluster_faces_objs = [face_map[fid] for fid in cluster_face_ids]

        # Find representative face (highest confidence)
        best_face = max(cluster_faces_objs, key=lambda f: f.confidence)

        # Compute centroid embedding
        cluster_embs = np.array([emb_map[fid] for fid in cluster_face_ids])
        centroid = cluster_embs.mean(axis=0)
        centroid_bytes = centroid.astype(np.float32).tobytes()

        person = Person(
            representative_face_id=best_face.id,
            face_count=len(cluster_face_ids),
            centroid_embedding=centroid_bytes,
        )
        db.add(person)
        db.flush()

        # Compute each face's similarity to centroid for confidence tiering
        centroid_norm = centroid / (np.linalg.norm(centroid) + 1e-8)
        for fid in cluster_face_ids:
            face = face_map[fid]
            face.person_id = person.id

            emb = emb_map[fid]
            emb_norm = emb / (np.linalg.norm(emb) + 1e-8)
            sim = float(np.dot(emb_norm, centroid_norm))

            if sim >= HIGH_CONFIDENCE_THRESHOLD:
                face.review_status = "auto"
            elif sim >= MEDIUM_CONFIDENCE_THRESHOLD:
                face.review_status = "pending"
                face.best_match_person_id = person.id
                face.best_match_score = sim
            else:
                face.review_status = "pending"
                face.best_match_person_id = person.id
                face.best_match_score = sim

        person_count += 1

    db.commit()

    if progress_callback:
        progress_callback(
            "clustering", 1, 1, f"Created {person_count} person clusters"
        )

    return person_count
