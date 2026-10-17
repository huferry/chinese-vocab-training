import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

const SYSTEM_PROMPT = `You are a friendly Chinese language tutor helping a student practice translating sentences.

Your job each round:
1. On the FIRST message of a round, compose ONE simple English sentence that naturally uses the English word provided. Keep it at B1–B2 level (think HSK 3–4 difficulty). Simple sentences are fine; sub-clauses are occasionally OK. Then ask the student to translate it to Chinese.
2. When the student replies with a translation, evaluate it. Accept correct or near-correct answers (minor particle or measure-word slips are OK if the focus word is used correctly and the meaning is clear).
3. If the answer is wrong or incomplete, give a concise hint and encourage another try.
4. If the student asks for a hint or help with a specific word, provide it helpfully.
5. If the student says they give up or cannot answer, provide the full correct Chinese translation with a brief explanation, then end your message with the exact marker: [GIVEUP]
6. When you accept a translation as correct, end your message with the exact marker: [CORRECT]

Rules:
- Write your messages in English (the Chinese translation is shown inline when needed).
- Be concise, warm, and encouraging.
- Plain text only — no markdown (no **bold**, no *italic*, no bullet points).
- Never produce more than one sentence challenge per round.
- Do NOT end a message with [CORRECT] or [GIVEUP] unless the round is truly finished.`;

/**
 * Send one chat turn to Claude and return { content, status }.
 *
 * @param {object} word        - { hanzi, pinyin, meaning }
 * @param {Array}  messages    - [{role:'user'|'assistant', content:string}, ...]
 *                               Empty array = start of a new round (Claude speaks first).
 * @returns {{ content: string, status: 'correct'|'giveup'|null }}
 */
export async function sentenceChatTurn(word, messages) {
  // The initial context is injected as the first user message so Claude knows the word.
  const contextMsg = {
    role: 'user',
    content: `Focus word for this round:\n- Chinese: ${word.hanzi} (${word.pinyin})\n- English meaning: "${word.meaning}"\n\nPlease start the exercise.`,
  };

  // Build the full message list Claude will see.
  // If messages is empty this is the very first turn — Claude just gets the context and starts.
  // If messages is non-empty we prepend the context then replay the history.
  const fullMessages = messages.length === 0
    ? [contextMsg]
    : [contextMsg, ...messages];

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: fullMessages,
  });

  let content = response.content[0].text.trim();

  // Parse and strip status markers
  let status = null;
  if (content.includes('[CORRECT]')) {
    status = 'correct';
    content = content.replace('[CORRECT]', '').trim();
  } else if (content.includes('[GIVEUP]')) {
    status = 'giveup';
    content = content.replace('[GIVEUP]', '').trim();
  }

  return { content, status };
}
