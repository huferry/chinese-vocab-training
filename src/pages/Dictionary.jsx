import { useState, useEffect, useRef, useMemo } from 'react';
import { autofillWord } from '../utils/autofill.js';
import { importFromFile } from '../utils/importWords.js';

const COLUMNS = [
  { key: 'hanzi',       label: 'Hanzi' },
  { key: 'pinyin',      label: 'Pinyin' },
  { key: 'level',       label: 'Level',        mobileHidden: true },
  { key: 'meaning',     label: 'Meaning' },
  { key: 'explanation', label: 'Explanation',  mobileHidden: true },
  { key: 'source',      label: 'Source',       mobileHidden: true },
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
  const [filling, setFilling]       = useState(false);
  const [formError, setFormError]   = useState(null);
  const dialogRef = useRef(null);

  // Import dialog state
  const [importOpen, setImportOpen]       = useState(false);
  const [importFile, setImportFile]       = useState(null);
  const [importSource, setImportSource]   = useState('');
  const [importStage, setImportStage]     = useState('form'); // 'form' | 'loading' | 'results'
  const [importResult, setImportResult]   = useState(null);  // { added, skipped }
  const [importError, setImportError]     = useState(null);
  const importDialogRef = useRef(null);

  useEffect(() => {
    fetch('/api/words')
      .then(r => { if (!r.ok) throw new Error('Failed to load words'); return r.json(); })
      .then(data => { setWords(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  // Close add-word dialog on backdrop click
  useEffect(() => {
    function onMouseDown(e) {
      if (dialogRef.current && !dialogRef.current.contains(e.target)) {
        handleCancel();
      }
    }
    if (dialogOpen) document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [dialogOpen]);

  // Close import dialog on backdrop click (only in form stage)
  useEffect(() => {
    function onMouseDown(e) {
      if (importDialogRef.current && !importDialogRef.current.contains(e.target) && importStage === 'form') {
        closeImport();
      }
    }
    if (importOpen) document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [importOpen, importStage]);

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

  async function handleAutofill() {
    if (!form.hanzi.trim()) {
      setFormError('Enter a hanzi first.');
      return;
    }
    setFilling(true);
    setFormError(null);
    try {
      const data = await autofillWord(form.hanzi.trim());
      setForm(f => ({
        ...f,
        pinyin:      data.pinyin,
        level:       String(data.level),
        meaning:     data.meaning,
        explanation: data.explanation,
      }));
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFilling(false);
    }
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

  function openImport() {
    setImportFile(null);
    setImportSource('');
    setImportStage('form');
    setImportResult(null);
    setImportError(null);
    setImportOpen(true);
  }

  function closeImport() {
    setImportOpen(false);
  }

  async function handleImportSubmit() {
    if (!importFile) { setImportError('Select a file first.'); return; }
    if (!importSource.trim()) { setImportError('Source is required.'); return; }
    setImportStage('loading');
    setImportError(null);
    try {
      const result = await importFromFile(importFile, importSource.trim());
      setImportResult(result);
      setWords(prev => [...prev, ...result.added]);
      setImportStage('results');
    } catch (err) {
      setImportError(err.message);
      setImportStage('form');
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
        <div className="dict-header-btns">
          <button className="dict-add-btn" onClick={openImport} title="Import from document or image">
            <svg viewBox="0 0 22 22" fill="currentColor" width="16" height="16" style={{marginRight:'2px',verticalAlign:'middle'}}>
              <path d="M5 3a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V8.414A2 2 0 0018.414 7L15 3.586A2 2 0 0013.586 3H5z" opacity=".45"/>
              <path d="M11 8a1 1 0 011 1v2h2a1 1 0 110 2h-2v2a1 1 0 11-2 0v-2H8a1 1 0 110-2h2V9a1 1 0 011-1z"/>
            </svg>
          </button>
          <button className="dict-add-btn" onClick={openDialog} title="Add word">＋</button>
        </div>
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
                <th key={col.key} className={[sortKey === col.key ? 'sorted' : '', col.mobileHidden ? 'mobile-hidden' : ''].filter(Boolean).join(' ')} onClick={() => handleSort(col.key)}>
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
                <td className="td-level mobile-hidden">{w.level}</td>
                <td>{w.meaning}</td>
                <td className="mobile-hidden">{w.explanation}</td>
                <td className="mobile-hidden">{w.source}</td>
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
                <div className="dialog-input-row">
                  <input className="dialog-input" name="hanzi" value={form.hanzi} onChange={handleField} autoFocus />
                  <button
                    type="button"
                    className="autofill-btn"
                    title="Autofill with AI"
                    onClick={handleAutofill}
                    disabled={filling || saving}
                  >
                    {filling ? '…' : '✨'}
                  </button>
                </div>
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

      {importOpen && (
        <div className="dialog-overlay">
          <div className="dialog dialog-import" ref={importDialogRef}>
            {importStage === 'form' && (
              <>
                <h3 className="dialog-title">Import from Document / Image</h3>
                <div className="dialog-fields">
                  <label className="dialog-label">
                    File
                    <input
                      type="file"
                      className="dialog-input"
                      accept="image/*,application/pdf"
                      onChange={e => setImportFile(e.target.files[0] ?? null)}
                    />
                  </label>
                  <label className="dialog-label">
                    Source
                    <input
                      className="dialog-input"
                      value={importSource}
                      onChange={e => setImportSource(e.target.value)}
                      list="import-source-options"
                      autoComplete="off"
                      placeholder="e.g. hsk3-ch5"
                    />
                    <datalist id="import-source-options">
                      {[...new Set(words.map(w => w.source).filter(Boolean))].sort().map(s => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </label>
                </div>
                {importError && <p className="dialog-error">{importError}</p>}
                <div className="dialog-actions">
                  <button className="dialog-btn dialog-cancel" onClick={closeImport}>Cancel</button>
                  <button className="dialog-btn dialog-ok" onClick={handleImportSubmit}>Import</button>
                </div>
              </>
            )}

            {importStage === 'loading' && (
              <div className="import-loading">
                <p>Extracting words with AI…</p>
                <div className="import-spinner" />
              </div>
            )}

            {importStage === 'results' && importResult && (
              <>
                <h3 className="dialog-title">Import Complete</h3>
                <p className="import-summary">
                  Added <strong>{importResult.added.length}</strong> word{importResult.added.length !== 1 ? 's' : ''}
                  {importResult.skipped.length > 0 && `, skipped ${importResult.skipped.length} duplicate${importResult.skipped.length !== 1 ? 's' : ''}`}.
                </p>
                {importResult.added.length > 0 && (
                  <div className="import-results-table-wrap">
                    <table className="dict-table import-results-table">
                      <thead>
                        <tr>
                          <th>Hanzi</th><th>Pinyin</th><th>Level</th><th>Meaning</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.added.map(w => (
                          <tr key={w.id}>
                            <td className="td-hanzi">{w.hanzi}</td>
                            <td className="td-pinyin">{w.pinyin}</td>
                            <td className="td-level">{w.level}</td>
                            <td>{w.meaning}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {importResult.skipped.length > 0 && (
                  <p className="import-skipped">
                    Skipped (already in dictionary): {importResult.skipped.join('、')}
                  </p>
                )}
                <div className="dialog-actions">
                  <button className="dialog-btn dialog-ok" onClick={closeImport}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
