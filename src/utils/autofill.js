export async function autofillWord(hanzi) {
  const res = await fetch('/api/autofill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hanzi }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Autofill failed');
  }
  return res.json();
}
