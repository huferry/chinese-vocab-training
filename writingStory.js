import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

export async function generateStory(words) {
  // Use up to 50 words; shuffle so repeated clicks yield varied stories
  const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, 50);
  const wordList  = shuffled.map(w => `${w.hanzi} (${w.pinyin}): ${w.meaning}`).join('\n');

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content:
        `You are a Chinese language teacher. Create a short story in Mandarin Chinese ` +
        `using as many of the provided vocabulary words as possible.\n\n` +
        `The story should be 6–10 sentences, have a title, and suit B1–B2 learners.\n` +
        `IMPORTANT: Do NOT use straight quotation marks (" or ') anywhere in the Chinese or pinyin text. ` +
        `Use Chinese quotation marks 「」 for dialogue instead.\n\n` +
        `Return ONLY a valid JSON object — no markdown, no extra text:\n` +
        `{\n` +
        `  "title": "<Chinese title>",\n` +
        `  "title_pinyin": "<pinyin with tone marks>",\n` +
        `  "title_translation": "<English translation of title>",\n` +
        `  "sentences": [\n` +
        `    { "chinese": "...", "pinyin": "...", "translation": "..." }\n` +
        `  ]\n` +
        `}\n\n` +
        `Vocabulary words:\n${wordList}`,
    }],
  });

  const raw  = message.content[0].text.trim().replace(/^```[a-z]*\n?/i, '').replace(/```$/, '').trim();
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
