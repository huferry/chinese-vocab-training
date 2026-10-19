// Combined weight: difficulty (confidence) boosted for less-played words.
// Higher confidence = harder word = more practice needed.
// Lower play_count = newer/less-seen word = should appear more.
export function wordWeight(word) {
  return (word.confidence ?? 1.0) / ((word.play_count ?? 0) + 1);
}

// Pick one word by weight, optionally excluding some IDs.
export function weightedPick(pool, excludeIds = []) {
  const candidates = excludeIds.length ? pool.filter(w => !excludeIds.includes(w.id)) : pool;
  if (!candidates.length) return pool[0];
  const totalWeight = candidates.reduce((s, w) => s + wordWeight(w), 0);
  let r = Math.random() * totalWeight;
  for (const w of candidates) {
    r -= wordWeight(w);
    if (r <= 0) return w;
  }
  return candidates[candidates.length - 1];
}

// Pick n distinct words by weight (without replacement).
export function weightedPickN(pool, n) {
  const result = [];
  const remaining = [...pool];
  for (let i = 0; i < Math.min(n, pool.length); i++) {
    const w = weightedPick(remaining);
    result.push(w);
    remaining.splice(remaining.indexOf(w), 1);
  }
  return result;
}
