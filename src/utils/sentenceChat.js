/**
 * Send one chat turn to the sentences API.
 *
 * @param {object} word     - { id, hanzi, pinyin, meaning }
 * @param {Array}  messages - [{role, content}] conversation so far (without the current turn)
 * @returns {{ content: string, status: 'correct'|'giveup'|null }}
 */
export async function sentenceChatTurn(word, messages) {
  const res = await fetch('/api/sentences/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, messages }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Chat request failed');
  }
  return res.json(); // { content, status }
}
