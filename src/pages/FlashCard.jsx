import { useState, useEffect } from 'react';
import WordFilter from '../components/WordFilter.jsx';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FlashCard() {
  const [allWords, setAllWords] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [deck, setDeck]         = useState(null); // null = filter screen
  const [deckIndex, setDeckIndex] = useState(0);
  const [revealed, setRevealed] = useState([false, false, false]);

  useEffect(() => {
    fetch('/api/words')
      .then(r => { if (!r.ok) throw new Error('Failed to load words'); return r.json(); })
      .then(data => { setAllWords(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  function handleStart(filtered) {
    setDeck(shuffle(filtered));
    setDeckIndex(0);
    setRevealed([false, false, false]);
  }

  function handleNext() {
    const nextIndex = deckIndex + 3;
    if (nextIndex >= deck.length) {
      setDeck(shuffle(deck));
      setDeckIndex(0);
    } else {
      setDeckIndex(nextIndex);
    }
    setRevealed([false, false, false]);
  }

  function toggleReveal(i) {
    setRevealed(r => r.map((v, idx) => (idx === i ? !v : v)));
  }

  if (loading) return <p className="status-msg">Loading words…</p>;
  if (error)   return <p className="error-msg">Error: {error}</p>;
  if (allWords.length === 0) return <p className="status-msg">No words in the database yet.</p>;

  if (!deck) return <WordFilter words={allWords} onStart={handleStart} />;

  const currentCards = deck.slice(deckIndex, deckIndex + 3);

  return (
    <div className="flashcard-page">
      <div className="page-header-row">
        <h2>Flash Cards</h2>
        <button className="wf-back-btn" onClick={() => setDeck(null)}>⟵ Change filters</button>
      </div>
      <div className="cards-grid">
        {currentCards.map((word, i) => (
          <div key={word.id} className="card">
            <div className="card-hanzi">{word.hanzi}</div>
            {revealed[i] && (
              <div className="card-reveal">
                {word.pinyin    && <div className="card-pinyin">{word.pinyin}</div>}
                <div className="card-meaning">{word.meaning}</div>
                {word.explanation && <div className="card-explanation">{word.explanation}</div>}
              </div>
            )}
            <button
              className={`btn btn-sm ${revealed[i] ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => toggleReveal(i)}
            >
              {revealed[i] ? 'Hide' : 'Show'}
            </button>
          </div>
        ))}
      </div>
      <div className="next-btn-row">
        <button className="btn btn-primary" onClick={handleNext}>Next →</button>
      </div>
    </div>
  );
}
