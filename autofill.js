import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

export async function autofillWord(hanzi) {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `You are a Chinese language expert. Given a Chinese word or phrase, return a JSON object with these fields:
- pinyin: the pinyin with tone marks (e.g. "nǐ hǎo")
- level: the HSK level as an integer 1–6 (best estimate)
- meaning: a concise English meaning (max ~10 words)
- explanation: a helpful explanation in English (1–3 sentences) covering usage, nuance, or related words

Respond with ONLY a valid JSON object, no markdown, no extra text.

Chinese word: ${hanzi}`,
      },
    ],
  });

  const raw  = message.content[0].text.trim();
  const text = raw.replace(/^```[a-z]*\n?/i, '').replace(/```$/,'').trim();
  const data = JSON.parse(text);

  // Validate shape
  if (!data.pinyin || !data.level || !data.meaning || !data.explanation) {
    throw new Error('Incomplete response from AI');
  }

  return {
    pinyin:      String(data.pinyin),
    level:       parseInt(data.level),
    meaning:     String(data.meaning),
    explanation: String(data.explanation),
  };
}
