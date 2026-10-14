import { useState, useEffect, useMemo } from 'react';

const COLUMNS = [
  { key: 'hanzi', label: 'Hanzi' },
  { key: 'pinyin', label: 'Pinyin' },
  { key: 'level', label: 'Level' },
  { key: 'meaning', label: 'Meaning' },
  { key: 'explanation', label: 'Explanation' },
  { key: 'source', label: 'Source' },
];

export default function Dictionary() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('level');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    fetch('/api/words')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load words');
        return r.json();
      })
      .then(data => {
        setWords(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return words.filter(w => {
      if (!q) return true;
      return (
        (w.meaning || '').toLowerCase().includes(q) ||
        (w.explanation || '').toLowerCase().includes(q)
      );
    });
  }, [words, query]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  if (loading) return <p className="status-msg">Loading words…</p>;
  if (error) return <p className="error-msg">Error: {error}</p>;

  return (
    <div className="dictionary-page">
      <h2>Dictionary</h2>
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
                <th
                  key={col.key}
                  className={sortKey === col.key ? 'sorted' : ''}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  <span className="sort-icon">
                    {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="status-msg">
                  No results found.
                </td>
              </tr>
            ) : (
              sorted.map(w => (
                <tr key={w.id}>
                  <td className="td-hanzi">{w.hanzi}</td>
                  <td className="td-pinyin">{w.pinyin}</td>
                  <td className="td-level">{w.level}</td>
                  <td>{w.meaning}</td>
                  <td>{w.explanation}</td>
                  <td>{w.source}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
