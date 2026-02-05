import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  type:     String,   // "photo", "video", "animated_gif"
  url:      String,   // media URL
  altText:  String,
  width:    Number,
  height:   Number
}, { _id: false });

const tweetSchema = new mongoose.Schema({
  tweetId:        { type: String, unique: true, index: true },
  text:           String,
  createdAt:      { type: Date, index: true },
  lang:           String,
  permalink:      String,
  likes:          Number,
  retweets:       Number,
  replies:        Number,
  quotes:         Number,
  bookmarks:      Number,
  views:          Number,
  isReply:        Boolean,
  isQuote:        Boolean,
  isRetweet:      Boolean,
  conversationId: String,
  // Reply context
  inReplyToTweetId: String,
  inReplyToUserId:  String,
  inReplyToUsername: String,
  // Quote tweet
  quotedTweetId:    String,
  quotedTweetText:  String,
  quotedTweetUser:  String,
  quotedTweetPermalink: String,
  // Retweet source
  retweetedTweetId:   String,
  retweetedTweetText: String,
  retweetedTweetUser: String,
  // Media
  media:          [mediaSchema],
  // Entities
  hashtags:       [String],
  urls:           [String],
  mentions:       [String],
  // Processing flags
  embedded:       { type: Boolean, default: false, index: true },
  scored:         { type: Boolean, default: false, index: true },
  username:       { type: String, index: true }
});

export const Tweet = mongoose.model('Tweet', tweetSchema);
