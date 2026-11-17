export async function getBreakdown(hanzi) {
  const res = await fetch(`/api/breakdown/${encodeURIComponent(hanzi)}`);
  if (!res.ok) throw new Error('Failed to load breakdown');
  return res.json(); // { hanzi, breakdown }
}
