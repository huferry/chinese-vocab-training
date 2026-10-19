import { useState, useEffect } from 'react';
import WordFilter from '../components/WordFilter.jsx';
import BreakdownPopup from '../components/BreakdownPopup.jsx';

async function fetchStory(words) {
  const res = await fetch('/api/writing/story', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ words }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate story');
  }
  return res.json();
}

export default function Writing() {
  const [allWords, setAllWords] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const [pool, setPool]             = useState(null);
  const [story, setStory]           = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError]     = useState(null);

  const [tooltip, setTooltip]           = useState(null); // { pinyin, translation, x, y }
  const [breakdownChar, setBreakdownChar] = useState(null);

  useEffect(() => {
    fetch('/api/words')
      .then(r => { if (!r.ok) throw new Error('Failed to load'); return r.json(); })
      .then(data => { setAllWords(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  async function loadStory(words) {
    setGenerating(true);
    setGenError(null);
    setStory(null);
    try {
      const data = await fetchStory(words);
      setStory(data);
    } catch (err) {
      setGenError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  function handleStart(filtered) {
    setPool(filtered);
    loadStory(filtered);
  }

  function handleNext() {
    setTooltip(null);
    loadStory(pool);
  }

  if (loading) return <p className="status-msg">Loading words…</p>;
  if (error)   return <p className="error-msg">Error: {error}</p>;
  if (allWords.length === 0) return <p className="status-msg">No words in the database yet.</p>;

  if (!pool) return <WordFilter words={allWords} onStart={handleStart} />;

  return (
    <>
    <div className="writing-page">
      <div className="page-header-row">
        <h2>Writing</h2>
        <button className="wf-back-btn" onClick={() => { setPool(null); setStory(null); }}>⟵ Change filters</button>
      </div>

      {generating && (
        <div className="writing-loading">
          <span className="writing-loading-dots">
            <span /><span /><span />
          </span>
          Generating story…
        </div>
      )}

      {genError && <p className="error-msg">Error: {genError}</p>}

      {story && !generating && (
        <div className="writing-story">
          <div className="writing-title">
            <div className="writing-title-hanzi">
              {[...story.title].map((char, i) => (
                <span key={i} className="hanzi-char writing-title-char" onClick={() => setBreakdownChar(char)}>{char}</span>
              ))}
            </div>
          </div>

          <div className="writing-sentences">
            <div className="writing-sentence-chinese">
              {story.sentences.map((s, i) =>
                [...s.chinese].map((char, j) => (
                  /[\u4e00-\u9fff\u3400-\u4dbf]/.test(char)
                    ? (
                      <span
                        key={`${i}-${j}`}
                        className="hanzi-char"
                        onClick={() => setBreakdownChar(char)}
                        onMouseEnter={e => setTooltip({ pinyin: s.pinyin, translation: s.translation, x: e.clientX, y: e.clientY })}
                        onMouseMove={e => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                        onMouseLeave={() => setTooltip(null)}
                      >{char}</span>
                    )
                    : <span key={`${i}-${j}`}>{char}</span>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {!generating && (story || genError) && (
        <div className="writing-actions">
          <button className="btn btn-primary" onClick={handleNext}>Next story</button>
        </div>
      )}
    </div>

    {tooltip && (
      <div
        className="writing-tooltip"
        style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
      >
        <div className="writing-tooltip-pinyin">{tooltip.pinyin}</div>
        <div className="writing-tooltip-translation">{tooltip.translation}</div>
      </div>
    )}

    {breakdownChar && (
      <BreakdownPopup hanzi={breakdownChar} onClose={() => setBreakdownChar(null)} />
    )}
    </>
  );
}
