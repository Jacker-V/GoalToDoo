const POS_MAP = {
  n: 'noun',
  noun: 'noun',
  v: 'verb',
  vi: 'verb',
  vt: 'verb',
  verb: 'verb',
  adj: 'adjective',
  adjective: 'adjective',
  adv: 'adverb',
  adverb: 'adverb',
  prep: 'preposition',
  preposition: 'preposition',
  conj: 'conjunction',
  conjunction: 'conjunction',
  idiom: 'idiom',
  phr: 'phrase',
  phrase: 'phrase',
  other: 'other',
};

const POS_PAREN_REGEX = /\((n|v|vi|vt|adj|adv|prep|conj|idiom|phr|phrase|noun|verb|adjective|adverb)\.?\)/i;

/**
 * Detect and normalize part of speech from a string or paren tag
 */
export function extractPartOfSpeech(str) {
  if (!str) return { cleanStr: '', partOfSpeech: null };
  const match = str.match(POS_PAREN_REGEX);
  if (match) {
    const rawPos = match[1].toLowerCase().replace(/\./g, '');
    const cleanStr = str.replace(POS_PAREN_REGEX, '').trim();
    return { cleanStr, partOfSpeech: POS_MAP[rawPos] || 'other' };
  }
  return { cleanStr: str.trim(), partOfSpeech: null };
}

/**
 * Split a line into segments respecting intra-word hyphens (e.g. state-of-the-art, long-term)
 */
function splitLineSegments(line) {
  if (line.includes('\t')) {
    return line.split('\t');
  }
  if (line.includes('|')) {
    return line.split('|');
  }
  // Check for spaced dash/hyphen: " - ", " – ", " — "
  if (/\s+[-–—]\s+/.test(line)) {
    return line.split(/\s+[-–—]\s+/);
  }
  // En-dash or em-dash without spaces
  if (/[–—]/.test(line)) {
    return line.split(/\s*[–—]\s*/);
  }
  // Multiple colons with spaces: "word : meaning : example"
  if (/\s+:\s+/.test(line)) {
    return line.split(/\s+:\s+/);
  }
  // Single colon (e.g. "word: meaning" or "word: meaning: example")
  if (line.includes(':')) {
    const idx = line.indexOf(':');
    return [line.slice(0, idx), line.slice(idx + 1)];
  }
  // Hyphen with space on at least one side: "word -meaning" or "word- meaning"
  if (/\s+-\s*|\s*-\s+/.test(line)) {
    return line.split(/\s+-\s*|\s*-\s+/);
  }
  return [];
}

/**
 * Parse a raw multiline text into an array of card objects:
 * Supported formats:
 * - word - meaning
 * - word - meaning - example
 * - word | meaning | example
 * - word : meaning
 * - word : meaning : example
 * - word\tmeaning\texample
 */
export function parseRawCardsText(rawText, defaultMeta = {}) {
  if (!rawText || typeof rawText !== 'string') return [];

  const lines = rawText.split(/\r?\n/);
  const parsedCards = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) {
      continue;
    }

    let segments = splitLineSegments(line);
    segments = segments.map((s) => s.trim()).filter((s) => s.length > 0);
    if (segments.length < 2) continue;

    let word = segments[0];
    let meaning = '';
    let example = '';
    let partOfSpeech = 'other';

    // Check parenthetical POS in word first: e.g. "ubiquitous (adj)" or "state-of-the-art (adj.)"
    const posInWord = extractPartOfSpeech(word);
    if (posInWord.partOfSpeech) {
      word = posInWord.cleanStr;
      partOfSpeech = posInWord.partOfSpeech;
    }

    if (segments.length === 2) {
      const posInMeaning = extractPartOfSpeech(segments[1]);
      if (posInMeaning.partOfSpeech && partOfSpeech === 'other') {
        partOfSpeech = posInMeaning.partOfSpeech;
      }
      meaning = posInMeaning.cleanStr || segments[1];
    } else if (segments.length >= 3) {
      // Check if segments[1] is a part of speech like 'n', 'v', 'adj'
      const normPos = POS_MAP[segments[1].toLowerCase().replace(/[().]/g, '')];
      if (normPos) {
        partOfSpeech = normPos;
        meaning = segments[2];
        example = segments.slice(3).join(' | ');
      } else {
        meaning = segments[1];
        example = segments.slice(2).join(' | ');
      }
    }

    // Secondary check for POS in meaning if still 'other'
    if (partOfSpeech === 'other') {
      const posInMeaning = extractPartOfSpeech(meaning);
      if (posInMeaning.partOfSpeech) {
        partOfSpeech = posInMeaning.partOfSpeech;
        meaning = posInMeaning.cleanStr;
      }
    }

    if (word && meaning) {
      parsedCards.push({
        word,
        meaning,
        partOfSpeech,
        example: example || '',
        note: '',
        source: defaultMeta.source || '',
        tags: Array.isArray(defaultMeta.tags) ? [...defaultMeta.tags] : [],
      });
    }
  }

  return parsedCards;
}
