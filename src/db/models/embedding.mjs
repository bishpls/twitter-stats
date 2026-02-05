import mongoose from 'mongoose';

const embeddingSchema = new mongoose.Schema({
  tweetId: { type: String, unique: true, index: true },
  vector:  [Number],
  model:   { type: String, default: 'all-MiniLM-L6-v2' }
});

export const Embedding = mongoose.model('Embedding', embeddingSchema);
