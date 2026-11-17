import { createClient } from './aiClient.js';

const client = createClient();

export async function fetchBreakdown(hanzi) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content:
        `Breakdown this Chinese character: ${hanzi}\n\n` +
        `First explain the meaning and show the pinyin ` +
        `Explain each radical (and its pinyin), how the hanzi is composed. Include etymology and common words formed by the character. ` +
        `Be concise but informative. Use plain text only — no markdown, no bullet symbols, no asterisks.`,
    }],
  });
  return message.content[0].text.trim();
}
