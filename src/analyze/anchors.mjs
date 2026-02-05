/**
 * Plutchik-based emotion anchor taxonomy.
 * 20 categories, each with descriptive phrases and a valence.
 */
export const ANCHORS = {
  joy: {
    valence: 1,
    phrases: [
      'I am so happy and delighted',
      'This fills me with pure joy',
      'I feel wonderful and ecstatic',
      'What a great and amazing feeling'
    ]
  },
  trust: {
    valence: 1,
    phrases: [
      'I completely trust and believe in this',
      'I have full confidence and faith',
      'This is reliable and dependable',
      'I feel safe and secure about this'
    ]
  },
  fear: {
    valence: -1,
    phrases: [
      'I am terrified and scared',
      'This is frightening and alarming',
      'I feel anxious and worried about this',
      'This fills me with dread and panic'
    ]
  },
  surprise: {
    valence: 0,
    phrases: [
      'I am completely shocked and surprised',
      'I did not expect this at all',
      'This is astonishing and unexpected',
      'What a sudden and startling revelation'
    ]
  },
  sadness: {
    valence: -1,
    phrases: [
      'I feel so sad and heartbroken',
      'This is deeply depressing and sorrowful',
      'I am grieving and in pain',
      'Overwhelming melancholy and despair'
    ]
  },
  disgust: {
    valence: -1,
    phrases: [
      'This is absolutely disgusting and revolting',
      'I feel repulsed and nauseated',
      'How vile and offensive',
      'This is morally repugnant'
    ]
  },
  anger: {
    valence: -1,
    phrases: [
      'I am furious and outraged',
      'This makes me incredibly angry',
      'I am seething with rage',
      'How infuriating and maddening'
    ]
  },
  anticipation: {
    valence: 1,
    phrases: [
      'Eagerly looking forward to this',
      'I cannot wait for what comes next',
      'Building excitement for the future',
      'Full of expectation and readiness'
    ]
  },
  love: {
    valence: 1,
    phrases: [
      'Deep affection and care',
      'I love this with all my heart',
      'Warmth and tenderness',
      'Devoted and passionate feelings'
    ]
  },
  optimism: {
    valence: 1,
    phrases: [
      'Things are looking up and getting better',
      'I am hopeful about the future',
      'Everything will work out well',
      'Bright outlook and positive expectations'
    ]
  },
  pessimism: {
    valence: -1,
    phrases: [
      'Nothing good will come of this',
      'Things are only going to get worse',
      'I have no hope for improvement',
      'The outlook is bleak and dire'
    ]
  },
  contempt: {
    valence: -1,
    phrases: [
      'Pure disdain and scorn',
      'I look down on this completely',
      'Utter disrespect and condescension',
      'This deserves nothing but mockery'
    ]
  },
  awe: {
    valence: 0,
    phrases: [
      'Breathtakingly overwhelming',
      'I am in complete awe and wonder',
      'This is magnificent and sublime',
      'Speechless at the grandeur'
    ]
  },
  remorse: {
    valence: -1,
    phrases: [
      'I deeply regret this',
      'I feel guilty and ashamed',
      'I wish I had done things differently',
      'Filled with remorse and self-blame'
    ]
  },
  sarcasm: {
    valence: -0.3,
    phrases: [
      'Oh sure, that is definitely going to work',
      'What a brilliant and genius idea, obviously',
      'Yeah right, because that always ends well',
      'Wow so impressive, I am totally blown away'
    ]
  },
  analytical: {
    valence: 0,
    phrases: [
      'Let me break down the data and evidence',
      'Analyzing the facts and information objectively',
      'Looking at this from a logical perspective',
      'The key factors and metrics to consider'
    ]
  },
  humor: {
    valence: 0.5,
    phrases: [
      'This is hilarious and so funny',
      'I cannot stop laughing at this',
      'What a great joke and punchline',
      'Comedy gold and pure entertainment'
    ]
  },
  frustration: {
    valence: -0.7,
    phrases: [
      'This is so frustrating and annoying',
      'Why does nothing work the way it should',
      'I am fed up and exasperated',
      'Stuck and unable to make progress'
    ]
  },
  pride: {
    valence: 1,
    phrases: [
      'I am so proud of this achievement',
      'What an accomplishment to celebrate',
      'Feeling confident and self-assured',
      'Standing tall with dignity and honor'
    ]
  },
  curiosity: {
    valence: 0.3,
    phrases: [
      'I am fascinated and want to know more',
      'This is intriguing and thought-provoking',
      'Exploring new ideas and possibilities',
      'Driven by wonder and inquiry'
    ]
  }
};
