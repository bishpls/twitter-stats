/**
 * Parse a raw GraphQL UserTweets response into flat tweet objects.
 */
export function parseResponse(json) {
  const tweets = [];
  const instructions = json?.data?.user?.result?.timeline_v2?.timeline?.instructions
    ?? json?.data?.user?.result?.timeline?.timeline?.instructions
    ?? [];

  for (const instruction of instructions) {
    const entries = instruction.entries ?? (instruction.entry ? [instruction.entry] : []);
    for (const entry of entries) {
      const parsed = parseEntry(entry);
      if (parsed) tweets.push(parsed);
    }
  }
  return tweets;
}

function parseEntry(entry) {
  if (!entry?.entryId?.startsWith('tweet-') && !entry?.entryId?.startsWith('profile-conversation-')) return null;

  // Handle conversation threads (profile-conversation entries contain multiple items)
  const items = entry.content?.items;
  if (items) {
    // Return only the first tweet in a conversation thread from this user
    for (const item of items) {
      const result = extractTweetResult(item?.item?.itemContent?.tweet_results?.result);
      if (result) return result;
    }
    return null;
  }

  const tweetResult = entry.content?.itemContent?.tweet_results?.result;
  return extractTweetResult(tweetResult);
}

function extractTweetResult(result) {
  if (!result) return null;

  // Handle TweetWithVisibilityResults wrapper
  if (result.__typename === 'TweetWithVisibilityResults') {
    result = result.tweet;
  }
  if (!result || result.__typename === 'TweetTombstone') return null;

  const legacy = result.legacy;
  if (!legacy) return null;

  const tweetId = result.rest_id;
  const username = result.core?.user_results?.result?.legacy?.screen_name ?? 'BishPlsOk';

  // Media extraction
  const media = (legacy.extended_entities?.media ?? legacy.entities?.media ?? []).map(m => ({
    type: m.type,  // "photo", "video", "animated_gif"
    url: m.type === 'photo'
      ? m.media_url_https
      : m.video_info?.variants
          ?.filter(v => v.content_type === 'video/mp4')
          ?.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))?.[0]?.url
        ?? m.media_url_https,
    altText: m.ext_alt_text ?? null,
    width: m.original_info?.width ?? null,
    height: m.original_info?.height ?? null
  }));

  // Quote tweet extraction
  const quotedResult = result.quoted_status_result?.result;
  let quotedTweetId = null, quotedTweetText = null, quotedTweetUser = null, quotedTweetPermalink = null;
  if (quotedResult) {
    const qr = quotedResult.__typename === 'TweetWithVisibilityResults' ? quotedResult.tweet : quotedResult;
    if (qr?.legacy) {
      quotedTweetId = qr.rest_id;
      quotedTweetText = qr.legacy.full_text;
      quotedTweetUser = qr.core?.user_results?.result?.legacy?.screen_name ?? null;
      if (quotedTweetId && quotedTweetUser) {
        quotedTweetPermalink = `https://x.com/${quotedTweetUser}/status/${quotedTweetId}`;
      }
    }
  }

  // Retweet source extraction
  const rtResult = legacy.retweeted_status_result?.result;
  let retweetedTweetId = null, retweetedTweetText = null, retweetedTweetUser = null;
  if (rtResult) {
    const rr = rtResult.__typename === 'TweetWithVisibilityResults' ? rtResult.tweet : rtResult;
    if (rr?.legacy) {
      retweetedTweetId = rr.rest_id;
      retweetedTweetText = rr.legacy.full_text;
      retweetedTweetUser = rr.core?.user_results?.result?.legacy?.screen_name ?? null;
    }
  }

  return {
    tweetId,
    text: legacy.full_text,
    createdAt: new Date(legacy.created_at),
    lang: legacy.lang,
    permalink: `https://x.com/${username}/status/${tweetId}`,
    likes: legacy.favorite_count ?? 0,
    retweets: legacy.retweet_count ?? 0,
    replies: legacy.reply_count ?? 0,
    quotes: legacy.quote_count ?? 0,
    bookmarks: legacy.bookmark_count ?? 0,
    views: parseInt(result.views?.count) || 0,
    isReply: !!legacy.in_reply_to_screen_name,
    isQuote: !!legacy.is_quote_status,
    isRetweet: !!legacy.retweeted_status_result,
    conversationId: legacy.conversation_id_str,
    // Reply context
    inReplyToTweetId: legacy.in_reply_to_status_id_str ?? null,
    inReplyToUserId: legacy.in_reply_to_user_id_str ?? null,
    inReplyToUsername: legacy.in_reply_to_screen_name ?? null,
    // Quote tweet
    quotedTweetId,
    quotedTweetText,
    quotedTweetUser,
    quotedTweetPermalink,
    // Retweet source
    retweetedTweetId,
    retweetedTweetText,
    retweetedTweetUser,
    // Media
    media,
    // Entities
    hashtags: (legacy.entities?.hashtags ?? []).map(h => h.text),
    urls: (legacy.entities?.urls ?? []).map(u => u.expanded_url),
    mentions: (legacy.entities?.user_mentions ?? []).map(m => m.screen_name),
    username
  };
}

/**
 * Extract the bottom cursor for pagination.
 */
export function extractCursor(json) {
  const instructions = json?.data?.user?.result?.timeline_v2?.timeline?.instructions
    ?? json?.data?.user?.result?.timeline?.timeline?.instructions
    ?? [];

  for (const instruction of instructions) {
    const entries = instruction.entries ?? [];
    for (const entry of entries) {
      if (entry.entryId?.startsWith('cursor-bottom-')) {
        return entry.content?.value;
      }
    }
  }
  return null;
}
