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

// Build a per-character map to the word it belongs to in the sentence
function buildCharWordMap(sentence) {
  const map = new Array([...sentence.chinese].length).fill(null);
  let searchFrom = 0;
  for (const word of sentence.words || []) {
    const idx = sentence.chinese.indexOf(word.hanzi, searchFrom);
    if (idx !== -1) {
      for (let i = idx; i < idx + word.hanzi.length; i++) {
        map[i] = word;
      }
      searchFrom = idx + word.hanzi.length;
    }
  }
  return map;
}

export default function Writing() {
  const [allWords, setAllWords] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const [pool, setPool]             = useState(null);
  const [story, setStory]           = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('writing_last_story') || 'null');
      // Discard stories generated before word-level hints were added
      if (s && !s.sentences?.[0]?.words) { localStorage.removeItem('writing_last_story'); return null; }
      return s;
    } catch { return null; }
  });
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError]     = useState(null);

  const [tooltip, setTooltip]             = useState(null); // { hanzi, pinyin, meaning, x, y }
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
      localStorage.setItem('writing_last_story', JSON.stringify(data));
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

  if (!pool && !story) return <WordFilter words={allWords} onStart={handleStart} />;

  return (
    <>
    <div className="writing-page">
      <div className="page-header-row">
        <h2>Writing</h2>
        <button className="wf-back-btn" onClick={() => { setPool(null); setStory(null); localStorage.removeItem('writing_last_story'); }}>⟵ Change filters</button>
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
              {story.sentences.map((s, si) => {
                const charWordMap = buildCharWordMap(s);
                return [...s.chinese].map((char, ci) => {
                  const word = charWordMap[ci];
                  const isChinese = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(char);
                  return isChinese ? (
                    <span
                      key={`${si}-${ci}`}
                      className="hanzi-char"
                      onClick={() => setBreakdownChar(char)}
                      onMouseEnter={e => word && setTooltip({ hanzi: word.hanzi, pinyin: word.pinyin, meaning: word.meaning, x: e.clientX, y: e.clientY })}
                      onMouseMove={e => word && setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                      onMouseLeave={() => setTooltip(null)}
                    >{char}</span>
                  ) : (
                    <span key={`${si}-${ci}`}>{char}</span>
                  );
                });
              })}
            </div>
          </div>
        </div>
      )}

      {!generating && (story || genError) && (
        <div className="writing-actions">
          <button className="btn btn-primary" onClick={handleNext} disabled={!pool}>Next story</button>
        </div>
      )}
    </div>

    {tooltip && (
      <div
        className="writing-tooltip"
        style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
      >
        <div className="writing-tooltip-strokes">
          {[...tooltip.hanzi].filter(c => /[\u4e00-\u9fff\u3400-\u4dbf]/.test(c)).map(c => (
            <img
              key={c}
              className="writing-tooltip-stroke-gif"
              src={`https://www.strokeorder.com/assets/bishun/animation/${c.codePointAt(0)}.gif`}
              alt={c}
            />
          ))}
        </div>
        <div className="writing-tooltip-pinyin">{tooltip.pinyin}</div>
        <div className="writing-tooltip-meaning">{tooltip.meaning}</div>
      </div>
    )}

    {breakdownChar && (
      <BreakdownPopup hanzi={breakdownChar} onClose={() => setBreakdownChar(null)} />
    )}
    </>
  );
}
