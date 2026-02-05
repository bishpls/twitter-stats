import mongoose from 'mongoose';

const scoreSchema = new mongoose.Schema({
  tweetId:     { type: String, unique: true, index: true },
  createdAt:   { type: Date, index: true },
  rawScores:   { type: Map, of: Number },
  dominant:    String,
  sentiment:   Number,
  zScores:     { type: Map, of: Number },
  percentiles: { type: Map, of: Number }
});

export const Score = mongoose.model('Score', scoreSchema);
