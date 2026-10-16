export async function importFromFile(file, source) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('source', source);

  const res = await fetch('/api/import', { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Import failed');
  }
  return res.json(); // { added: [...], skipped: ['hanzi', ...] }
}
