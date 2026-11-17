export function recordPlay(wordId) {
  fetch(`/api/words/${wordId}/play`, { method: 'POST' }).catch(() => {});
}
