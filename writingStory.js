import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

export async function generateStory(words) {
  // Use up to 50 words; shuffle so repeated clicks yield varied stories
  const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, 50);
  const wordList  = shuffled.map(w => `${w.hanzi} (${w.pinyin}): ${w.meaning}`).join('\n');

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content:
        `You are a Chinese language teacher. Create a short story in Mandarin Chinese ` +
        `using as many of the provided vocabulary words as possible.\n\n` +
        `The story should be 6–10 sentences, have a title, and suit A2–B1 learners.\n` +
        `Keep sentences short and simple: one idea per sentence, basic grammar structures, no complex subordinate clauses.\n` +
        `IMPORTANT: Do NOT use straight quotation marks (" or ') anywhere in the Chinese or pinyin text. ` +
        `Use Chinese quotation marks 「」 for dialogue instead.\n\n` +
        `Return ONLY a valid JSON object — no markdown, no extra text:\n` +
        `{\n` +
        `  "title": "<Chinese title>",\n` +
        `  "title_pinyin": "<pinyin with tone marks>",\n` +
        `  "title_translation": "<English translation of title>",\n` +
        `  "sentences": [\n` +
        `    {\n` +
        `      "chinese": "full sentence including punctuation",\n` +
        `      "translation": "English translation of the sentence",\n` +
        `      "words": [\n` +
        `        { "hanzi": "word", "pinyin": "pīnyīn", "meaning": "English meaning" }\n` +
        `      ]\n` +
        `    }\n` +
        `  ]\n` +
        `}\n\n` +
        `Each sentence's "words" array must contain EVERY Chinese word or character in the sentence — including particles (的, 了, 在, 是, etc.), pronouns, prepositions, and all other words. The only things to exclude are punctuation marks. Every Chinese character in the sentence must belong to exactly one entry in the words array.\n\n` +
        `Vocabulary words:\n${wordList}`,
    }],
  });

  const text = message.content[0].text;
  // Extract the JSON object regardless of any preamble or markdown fences
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in AI response');
  const raw = text.slice(start, end + 1);
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    // Attempt to fix unescaped quotes inside JSON string values
    const fixed = raw.replace(/"(chinese|pinyin|translation|title[^"]*)":\s*"((?:[^"\\]|\\.)*)"/g,
      (_, key, val) => `"${key}": "${val.replace(/(?<!\\)"/g, '\\"')}"`);
    data = JSON.parse(fixed);
  }
  if (!data.title || !Array.isArray(data.sentences)) throw new Error('Invalid story format from AI');
  return data;
}
