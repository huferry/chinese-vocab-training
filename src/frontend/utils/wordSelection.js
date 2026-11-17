// Compute a weight map for the pool.
// play_count percentile rank (relative to pool) drives priority more than confidence.
// Low percentile (less played) → high weight. Low confidence (less known) → high weight.
export function poolWeights(pool) {
  const sorted = [...pool].sort((a, b) => (a.play_count ?? 0) - (b.play_count ?? 0));
  const n = sorted.length;
  const percentileMap = new Map(
    sorted.map((w, i) => [w.id, n === 1 ? 0.5 : i / (n - 1)])
  );
  return new Map(pool.map(w => {
    const p = percentileMap.get(w.id) ?? 0.5;
    // p=0 (least played) → playFactor=1.21, p=1 (most played) → playFactor=0.01
    const playFactor = Math.pow(1.1 - p, 2);
    return [w.id, playFactor / (w.confidence ?? 1.0)];
  }));
}

// Pick one word by weight. Accepts a pre-computed weights map (or computes from candidates).
export function weightedPick(pool, excludeIds = [], weights) {
  const candidates = excludeIds.length ? pool.filter(w => !excludeIds.includes(w.id)) : pool;
  if (!candidates.length) return pool[0];
  const w = weights ?? poolWeights(candidates);
  const total = candidates.reduce((s, word) => s + (w.get(word.id) ?? 1), 0);
  let r = Math.random() * total;
  for (const word of candidates) {
    r -= w.get(word.id) ?? 1;
    if (r <= 0) return word;
  }
  return candidates[candidates.length - 1];
}

// Pick n distinct words by weight (without replacement).
// Weights computed once from the full pool so percentile ranks stay stable.
export function weightedPickN(pool, n) {
  const weights = poolWeights(pool);
  const result = [];
  const remaining = [...pool];
  for (let i = 0; i < Math.min(n, pool.length); i++) {
    const word = weightedPick(remaining, [], weights);
    result.push(word);
    remaining.splice(remaining.indexOf(word), 1);
  }
  return result;
}
