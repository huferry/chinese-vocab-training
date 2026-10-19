import { useState, useEffect } from 'react';
import WordFilter from '../components/WordFilter.jsx';
import { weightedPick } from '../utils/wordSelection.js';
import { recordPlay } from '../utils/recordPlay.js';

function pickThree(pool) {
  const slots = [];
  for (let i = 0; i < Math.min(3, pool.length); i++) {
    const word = weightedPick(pool, slots.map(s => s.word.id));
    recordPlay(word.id);
    slots.push({ word, revealed: false, exiting: false, gone: false });
  }
  return slots;
}

export default function FlashCard() {
  const [allWords, setAllWords] = useState([]);
  const [pool, setPool]         = useState(null);
  const [slots, setSlots]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    fetch('/api/words')
      .then(r => { if (!r.ok) throw new Error('Failed to load'); return r.json(); })
      .then(data => { setAllWords(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  function handleStart(filtered) {
    setPool(filtered);
    setSlots(pickThree(filtered));
  }

  function updatePoolConfidence(id, newConfidence) {
    setPool(prev => prev.map(w => w.id === id ? { ...w, confidence: newConfidence } : w));
    setAllWords(prev => prev.map(w => w.id === id ? { ...w, confidence: newConfidence } : w));
  }

  function handleRate(slotIndex, confident) {
    const word = slots[slotIndex].word;

    // Start exit animation
    setSlots(prev => prev.map((s, i) => i === slotIndex ? { ...s, exiting: true } : s));

    // Save confidence to DB
    fetch(`/api/words/${word.id}/confidence`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confident }),
    })
      .then(r => r.json())
      .then(({ confidence }) => updatePoolConfidence(word.id, confidence))
      .catch(() => {});

    // After animation: mark as gone, then check if all gone
    setTimeout(() => {
      setSlots(prev => {
        const next = prev.map((s, i) => i === slotIndex ? { ...s, exiting: false, gone: true } : s);
        // If all slots are gone, load 3 new cards
        if (next.every(s => s.gone)) {
          return pickThree(pool);
        }
        return next;
      });
    }, 300);
  }

  function toggleReveal(i) {
    setSlots(prev => prev.map((s, idx) => idx === i ? { ...s, revealed: !s.revealed } : s));
  }

  if (loading) return <p className="status-msg">Loading words…</p>;
  if (error)   return <p className="error-msg">Error: {error}</p>;
  if (allWords.length === 0) return <p className="status-msg">No words in the database yet.</p>;

  if (!pool) return <WordFilter words={allWords} onStart={handleStart} />;

  return (
    <div className="flashcard-page">
      <div className="page-header-row">
        <h2>Flash Cards</h2>
        <button className="wf-back-btn" onClick={() => setPool(null)}>⟵ Change filters</button>
      </div>
      <div className="cards-grid">
        {slots.map((slot, i) => (
          slot.gone ? (
            <div key={`empty-${i}`} className="card card-placeholder" />
          ) : (
            <div key={slot.word.id} className={`card${slot.exiting ? ' card-exit' : ''}`}>
              <div className="card-top-actions">
                <button
                  className="card-rate-btn card-rate-yes"
                  title="Confident"
                  style={{ visibility: slot.revealed ? 'hidden' : 'visible' }}
                  onClick={() => handleRate(i, true)}
                >✓</button>
                <button
                  className="card-rate-btn card-rate-no"
                  title="Not confident yet"
                  onClick={() => handleRate(i, false)}
                >✗</button>
              </div>
              <div className="card-hanzi">
                <span className="hanzi-badge-wrap">
                  {slot.word.hanzi}
                  <span className="hsk-badge">HSK {slot.word.level}</span>
                </span>
              </div>
              {slot.revealed && (
                <div className="card-reveal">
                  {slot.word.pinyin    && <div className="card-pinyin">{slot.word.pinyin}</div>}
                  <div className="card-meaning">{slot.word.meaning}</div>
                  {slot.word.explanation && <div className="card-explanation">{slot.word.explanation}</div>}
                </div>
              )}
              <button
                className={`btn btn-sm ${slot.revealed ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => toggleReveal(i)}
              >
                {slot.revealed ? 'Hide' : 'Show'}
              </button>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
