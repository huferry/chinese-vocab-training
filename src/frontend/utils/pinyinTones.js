// Maps base vowel → [tone1, tone2, tone3, tone4, neutral]
const TONE_MAP = {
  a: ['ā', 'á', 'ǎ', 'à', 'a'],
  e: ['ē', 'é', 'ě', 'è', 'e'],
  i: ['ī', 'í', 'ǐ', 'ì', 'i'],
  o: ['ō', 'ó', 'ǒ', 'ò', 'o'],
  u: ['ū', 'ú', 'ǔ', 'ù', 'u'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
};

const STRIP_MAP = {
  'ā':'a','á':'a','ǎ':'a','à':'a',
  'ē':'e','é':'e','ě':'e','è':'e',
  'ī':'i','í':'i','ǐ':'i','ì':'i',
  'ō':'o','ó':'o','ǒ':'o','ò':'o',
  'ū':'u','ú':'u','ǔ':'u','ù':'u',
  'ǖ':'ü','ǘ':'ü','ǚ':'ü','ǜ':'ü',
};

export function stripTones(pinyin) {
  return [...pinyin].map(c => STRIP_MAP[c] ?? c).join('');
}

export function extractTone(syllable) {
  for (const c of syllable) {
    if ('āēīōūǖ'.includes(c)) return 1;
    if ('áéíóúǘ'.includes(c)) return 2;
    if ('ǎěǐǒǔǚ'.includes(c)) return 3;
    if ('àèìòùǜ'.includes(c)) return 4;
  }
  return 0; // neutral
}

export function extractTones(pinyin) {
  return pinyin.split(' ').map(extractTone);
}

// Apply a single tone number (1-4, or 0=neutral) to a stripped syllable
export function applyTone(syllableBase, tone) {
  if (tone === 0) return syllableBase;
  const s = syllableBase;
  const toneIdx = tone - 1;

  // Rule 1: 'a' or 'e' always gets the tone mark
  for (const v of ['a', 'e']) {
    const idx = s.indexOf(v);
    if (idx !== -1) {
      return s.slice(0, idx) + TONE_MAP[v][toneIdx] + s.slice(idx + 1);
    }
  }

  // Rule 2: 'ou' → 'o' gets the tone
  const ouIdx = s.indexOf('ou');
  if (ouIdx !== -1) {
    return s.slice(0, ouIdx) + TONE_MAP['o'][toneIdx] + s.slice(ouIdx + 1);
  }

  // Rule 3: last vowel gets the tone
  const vowels = 'aeiouü';
  for (let i = s.length - 1; i >= 0; i--) {
    const c = s[i];
    if (vowels.includes(c)) {
      return s.slice(0, i) + TONE_MAP[c][toneIdx] + s.slice(i + 1);
    }
  }

  return syllableBase;
}

// Apply an array of tone numbers to space-separated base pinyin
export function applyTones(base, tones) {
  return base.split(' ').map((s, i) => applyTone(s, tones[i] ?? 0)).join(' ');
}

// Generate `count` tone arrays that differ from correctTones
export function generateWrongToneSets(correctTones, count) {
  const used = new Set([JSON.stringify(correctTones)]);
  const result = [];
  let attempts = 0;

  while (result.length < count && attempts < 300) {
    attempts++;
    const candidate = correctTones.map(() => Math.floor(Math.random() * 4) + 1);
    const key = JSON.stringify(candidate);
    if (!used.has(key)) {
      used.add(key);
      result.push(candidate);
    }
  }

  // Deterministic fallback: iterate tones sequentially
  outer: for (let t = 1; t <= 4 && result.length < count; t++) {
    const candidate = correctTones.map(() => t);
    const key = JSON.stringify(candidate);
    if (!used.has(key)) {
      used.add(key);
      result.push(candidate);
    }
  }

  return result.slice(0, count);
}
