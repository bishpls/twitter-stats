/**
 * Cosine similarity between two vectors.
 * Assumes vectors are already normalized (unit vectors) so dot product = cosine.
 */
export function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}
