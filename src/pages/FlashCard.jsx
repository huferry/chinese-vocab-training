import { useState, useEffect, useCallback } from 'react';
import WordFilter from '../components/WordFilter.jsx';

// Weighted random pick — excludes words currently on screen
function weightedPick(pool, excludeIds) {
  const candidates = pool.filter(w => !excludeIds.includes(w.id));
  if (!candidates.length) return pool.find(w => !excludeIds.slice(0, pool.length - 1).includes(w.id)) ?? pool[0];

  const totalWeight = candidates.reduce((s, w) => s + (w.confidence ?? 1.0), 0);
  let r = Math.random() * totalWeight;
  for (const w of candidates) {
    r -= (w.confidence ?? 1.0);
    if (r <= 0) return w;
  }
  return candidates[candidates.length - 1];
}

function initSlots(pool) {
  const slots = [];
  for (let i = 0; i < Math.min(3, pool.length); i++) {
    const word = weightedPick(pool, slots.map(s => s.word.id));
    slots.push({ word, revealed: false, exiting: false });
  }
  return slots;
}

export default function FlashCard() {
  const [allWords, setAllWords] = useState([]);
  const [pool, setPool]         = useState(null); // null = filter screen
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
    setSlots(initSlots(filtered));
  }

  // Update a word's confidence in the local pool so future picks reflect it
  function updatePoolConfidence(id, newConfidence) {
    setPool(prev => prev.map(w => w.id === id ? { ...w, confidence: newConfidence } : w));
    setAllWords(prev => prev.map(w => w.id === id ? { ...w, confidence: newConfidence } : w));
  }

  const handleRate = useCallback((slotIndex, confident) => {
    const word = slots[slotIndex].word;

    // Optimistically animate out
    setSlots(prev => prev.map((s, i) => i === slotIndex ? { ...s, exiting: true } : s));

    // Call API
    fetch(`/api/words/${word.id}/confidence`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confident }),
    })
      .then(r => r.json())
      .then(({ confidence }) => updatePoolConfidence(word.id, confidence))
      .catch(() => {}); // fire-and-forget; UI proceeds regardless

    // After exit animation, swap in a new card
    setTimeout(() => {
      setSlots(prev => {
        const currentIds = prev.map(s => s.word.id);
        const next = weightedPick(pool, currentIds.filter((_, i) => i !== slotIndex));
        return prev.map((s, i) =>
          i === slotIndex ? { word: next, revealed: false, exiting: false } : s
        );
      });
    }, 300);
  }, [slots, pool]);

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
          <div key={slot.word.id} className={`card${slot.exiting ? ' card-exit' : ''}`}>
            <div className="card-top-actions">
              <button
                className="card-rate-btn card-rate-no"
                title="Not confident yet"
                onClick={() => handleRate(i, false)}
              >✗</button>
              <button
                className="card-rate-btn card-rate-yes"
                title="Confident"
                onClick={() => handleRate(i, true)}
              >✓</button>
            </div>
            <div className="card-hanzi">{slot.word.hanzi}</div>
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
        ))}
      </div>
    </div>
  );
}
