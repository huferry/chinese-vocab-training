import { useState, useEffect, useRef, useMemo } from 'react';

const COLUMNS = [
  { key: 'hanzi',       label: 'Hanzi' },
  { key: 'pinyin',      label: 'Pinyin' },
  { key: 'level',       label: 'Level' },
  { key: 'meaning',     label: 'Meaning' },
  { key: 'explanation', label: 'Explanation' },
  { key: 'source',      label: 'Source' },
];

const HSK_LEVELS = [1, 2, 3, 4, 5, 6];

const EMPTY_FORM = { hanzi: '', pinyin: '', level: '', meaning: '', explanation: '', source: '' };

export default function Dictionary() {
  const [words, setWords]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [query, setQuery]     = useState('');
  const [sortKey, setSortKey] = useState('level');
  const [sortDir, setSortDir] = useState('asc');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    fetch('/api/words')
      .then(r => { if (!r.ok) throw new Error('Failed to load words'); return r.json(); })
      .then(data => { setWords(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  // Close on backdrop click
  useEffect(() => {
    function onMouseDown(e) {
      if (dialogRef.current && !dialogRef.current.contains(e.target)) {
        handleCancel();
      }
    }
    if (dialogOpen) document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [dialogOpen]);

  function openDialog() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  }

  function handleCancel() {
    setDialogOpen(false);
    setFormError(null);
  }

  function handleField(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleOk() {
    const { hanzi, pinyin, level, meaning, explanation, source } = form;
    if (!hanzi || !pinyin || !level || !meaning || !explanation || !source) {
      setFormError('All fields are required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hanzi, pinyin, level, meaning, explanation, source }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed');
      const newWord = await res.json();
      setWords(prev => [...prev, newWord]);
      setDialogOpen(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return words.filter(w => !q ||
      (w.meaning || '').toLowerCase().includes(q) ||
      (w.explanation || '').toLowerCase().includes(q)
    );
  }, [words, query]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const av = a[sortKey] ?? '', bv = b[sortKey] ?? '';
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return sortDir === 'asc' ? cmp : -cmp;
  }), [filtered, sortKey, sortDir]);

  if (loading) return <p className="status-msg">Loading words…</p>;
  if (error)   return <p className="error-msg">Error: {error}</p>;

  return (
    <div className="dictionary-page">
      <div className="page-header-row">
        <h2>Dictionary <span className="dict-count">({words.length})</span></h2>
        <button className="dict-add-btn" onClick={openDialog} title="Add word">＋</button>
      </div>

      <input
        className="search-box"
        type="search"
        placeholder="Search by meaning or explanation…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />

      <div className="dict-table-wrap">
        <table className="dict-table">
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th key={col.key} className={sortKey === col.key ? 'sorted' : ''} onClick={() => handleSort(col.key)}>
                  {col.label}
                  <span className="sort-icon">{sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={COLUMNS.length} className="status-msg">No results found.</td></tr>
            ) : sorted.map(w => (
              <tr key={w.id}>
                <td className="td-hanzi">{w.hanzi}</td>
                <td className="td-pinyin">{w.pinyin}</td>
                <td className="td-level">{w.level}</td>
                <td>{w.meaning}</td>
                <td>{w.explanation}</td>
                <td>{w.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialogOpen && (
        <div className="dialog-overlay">
          <div className="dialog" ref={dialogRef}>
            <h3 className="dialog-title">Add Word</h3>

            <div className="dialog-fields">
              <label className="dialog-label">
                Hanzi
                <input className="dialog-input" name="hanzi" value={form.hanzi} onChange={handleField} autoFocus />
              </label>
              <label className="dialog-label">
                Pinyin
                <input className="dialog-input" name="pinyin" value={form.pinyin} onChange={handleField} />
              </label>
              <label className="dialog-label">
                HSK Level
                <select className="dialog-input" name="level" value={form.level} onChange={handleField}>
                  <option value="">— select —</option>
                  {HSK_LEVELS.map(l => <option key={l} value={l}>HSK {l}</option>)}
                </select>
              </label>
              <label className="dialog-label">
                Meaning
                <input className="dialog-input" name="meaning" value={form.meaning} onChange={handleField} />
              </label>
              <label className="dialog-label">
                Explanation
                <textarea className="dialog-input dialog-textarea" name="explanation" value={form.explanation} onChange={handleField} rows={3} />
              </label>
              <label className="dialog-label">
                Source
                <input
                  className="dialog-input"
                  name="source"
                  value={form.source}
                  onChange={handleField}
                  list="source-options"
                  autoComplete="off"
                />
                <datalist id="source-options">
                  {[...new Set(words.map(w => w.source).filter(Boolean))].sort().map(s => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>
            </div>

            {formError && <p className="dialog-error">{formError}</p>}

            <div className="dialog-actions">
              <button className="dialog-btn dialog-cancel" onClick={handleCancel} disabled={saving}>Cancel</button>
              <button className="dialog-btn dialog-ok" onClick={handleOk} disabled={saving}>
                {saving ? 'Saving…' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
