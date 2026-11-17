export async function importFromFile(file, source, tags = [], minLevel = 1) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('source', source);
  formData.append('tags', JSON.stringify(tags));
  formData.append('minLevel', String(minLevel));

  const res = await fetch('/api/import', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Import failed');
  }
  return res.json(); // { added: [...], skipped: ['hanzi', ...] }
}
