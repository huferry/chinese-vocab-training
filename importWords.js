import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

const EXTRACT_PROMPT = `You are a Chinese language expert. Extract Chinese vocabulary words or phrases from the provided content that are HSK level 3 or higher (levels 3, 4, 5, or 6).

For each word, return a JSON array of objects with these fields:
- hanzi: the Chinese characters
- pinyin: pinyin with tone marks (e.g. "nǐ hǎo")
- level: HSK level as an integer (3, 4, 5, or 6)
- meaning: concise English meaning (max ~10 words)
- explanation: helpful English explanation (1–3 sentences) covering usage, nuance, or related words

Rules:
- Only include words at HSK3 or above
- Do not include proper nouns, place names, or people's names
- Do not include single characters that are too basic (HSK1/2)
- If a word appears multiple times, include it only once
- Return at most 80 words (pick the most useful/diverse ones if there are more)
- Respond with ONLY a valid JSON array, no markdown, no extra text

If no HSK3+ words are found, return an empty array: []`;

/**
 * Attempt to salvage a truncated JSON array by trimming to the last complete object.
 */
function repairJson(raw) {
  // Try as-is first
  try { return JSON.parse(raw); } catch (_) {}

  // Find the last complete object: trim after the last "},"  or "}" before the final "]"
  const lastClose = raw.lastIndexOf('}');
  if (lastClose === -1) return [];
  const trimmed = raw.slice(0, lastClose + 1) + ']';
  try { return JSON.parse(trimmed); } catch (_) {}

  return [];
}

/**
 * Extract HSK3+ Chinese words from a file buffer.
 * @param {Buffer} buffer   - file contents
 * @param {string} mimeType - e.g. 'image/jpeg', 'application/pdf', 'text/plain'
 * @returns {Array<{hanzi,pinyin,level,meaning,explanation}>}
 */
export async function extractWordsFromFile(buffer, mimeType) {
  const isImage = mimeType.startsWith('image/');
  const isPdf   = mimeType === 'application/pdf';
  const isText  = mimeType === 'text/plain' || mimeType === 'text/srt' || mimeType === 'application/octet-stream';

  if (!isImage && !isPdf && !isText) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  let messageContent;

  if (isText) {
    // Send as plain text — much more token-efficient than base64
    const text = buffer.toString('utf8');
    messageContent = [{ type: 'text', text: `${EXTRACT_PROMPT}\n\nContent:\n${text}` }];
  } else {
    const base64 = buffer.toString('base64');
    const sourceContent = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
      : { type: 'image',    source: { type: 'base64', media_type: mimeType,           data: base64 } };

    messageContent = [
      sourceContent,
      { type: 'text', text: EXTRACT_PROMPT },
    ];
  }

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8192,
    messages: [{ role: 'user', content: messageContent }],
  });

  const raw  = message.content[0].text.trim();
  const text = raw.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '').trim();
  const data = repairJson(text);

  if (!Array.isArray(data)) throw new Error('Unexpected response format from AI');

  return data.map(w => ({
    hanzi:       String(w.hanzi || '').trim(),
    pinyin:      String(w.pinyin || '').trim(),
    level:       parseInt(w.level) || 3,
    meaning:     String(w.meaning || '').trim(),
    explanation: String(w.explanation || '').trim(),
  })).filter(w => w.hanzi && w.pinyin && w.meaning && w.explanation);
}
