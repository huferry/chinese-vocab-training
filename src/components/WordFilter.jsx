import { useState, useEffect } from 'react';

function usePersistState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

export default function WordFilter({ words, onStart }) {
  const levels  = [...new Set(words.map(w => w.level).filter(Boolean))].sort((a, b) => a - b);
  const sources = [...new Set(words.map(w => w.source).filter(Boolean))].sort();
  const tags    = [...new Set(words.flatMap(w => w.tags ?? []))].sort();

  const [selLevels,  setSelLevels]  = usePersistState('wf_levels',  levels);
  const [selSources, setSelSources] = usePersistState('wf_sources', sources);
  const [selTags,    setSelTags]    = usePersistState('wf_tags',    []);

  const activeLevels  = selLevels.filter(l => levels.includes(l));
  const activeSources = selSources.filter(s => sources.includes(s));
  const activeTags    = selTags.filter(t => tags.includes(t));

  const filtered = words.filter(w =>
    (activeLevels.length  === 0 || activeLevels.includes(w.level))  &&
    (activeSources.length === 0 || activeSources.includes(w.source)) &&
    (activeTags.length    === 0 || activeTags.some(t => (w.tags ?? []).includes(t)))
  );

  function toggleLevel(l) {
    setSelLevels(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
  }

  function toggleSource(s) {
    setSelSources(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  function toggleTag(t) {
    setSelTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  return (
    <div className="wf-page">
      <div className="wf-box">
        <div className="wf-section">
          <div className="wf-section-header">
            <span className="wf-section-title">HSK Level</span>
            <div className="wf-toggles">
              <button className="wf-link" onClick={() => setSelLevels([...levels])}>All</button>
              <span className="wf-sep">·</span>
              <button className="wf-link" onClick={() => setSelLevels([])}>None</button>
            </div>
          </div>
          <div className="wf-chips">
            {levels.map(l => (
              <label key={l} className={`wf-chip${activeLevels.includes(l) ? ' checked' : ''}`}>
                <input type="checkbox" checked={activeLevels.includes(l)} onChange={() => toggleLevel(l)} />
                HSK {l}
              </label>
            ))}
          </div>
        </div>

        <div className="wf-section">
          <div className="wf-section-header">
            <span className="wf-section-title">Source</span>
            <div className="wf-toggles">
              <button className="wf-link" onClick={() => setSelSources([...sources])}>All</button>
              <span className="wf-sep">·</span>
              <button className="wf-link" onClick={() => setSelSources([])}>None</button>
            </div>
          </div>
          <div className="wf-chips">
            {sources.map(s => (
              <label key={s} className={`wf-chip${activeSources.includes(s) ? ' checked' : ''}`}>
                <input type="checkbox" checked={activeSources.includes(s)} onChange={() => toggleSource(s)} />
                {s}
              </label>
            ))}
          </div>
        </div>

        {tags.length > 0 && (
          <div className="wf-section">
            <div className="wf-section-header">
              <span className="wf-section-title">Tags</span>
              <div className="wf-toggles">
                <button className="wf-link" onClick={() => setSelTags([])}>Any</button>
              </div>
            </div>
            <div className="wf-chips">
              {tags.map(t => (
                <label key={t} className={`wf-chip${activeTags.includes(t) ? ' checked' : ''}`}>
                  <input type="checkbox" checked={activeTags.includes(t)} onChange={() => toggleTag(t)} />
                  {t}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="wf-footer">
          <span className="wf-count">{filtered.length} word{filtered.length !== 1 ? 's' : ''} selected</span>
          <button className="quiz-btn" disabled={filtered.length === 0} onClick={() => onStart(filtered)}>
            Start
          </button>
        </div>
      </div>
    </div>
  );
}
