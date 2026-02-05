import { pipeline } from '@huggingface/transformers';

let _pipe = null;

export async function getEmbedder() {
  if (!_pipe) {
    console.log('Loading embedding model (first run downloads ~80MB)...');
    _pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('Model loaded.');
  }
  return _pipe;
}

/**
 * Embed an array of texts → array of 384-dim unit vectors.
 */
export async function embed(texts) {
  const pipe = await getEmbedder();
  const results = [];
  for (const text of texts) {
    const output = await pipe(text, { pooling: 'mean', normalize: true });
    results.push(Array.from(output.data));
  }
  return results;
}
