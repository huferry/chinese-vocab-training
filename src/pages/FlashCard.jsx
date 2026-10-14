import { useState, useEffect } from 'react';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FlashCard() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deck, setDeck] = useState([]);
  const [deckIndex, setDeckIndex] = useState(0);
  const [revealed, setRevealed] = useState([false, false, false]);

  useEffect(() => {
    fetch('/api/words')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load words');
        return r.json();
      })
      .then(data => {
        setWords(data);
        setDeck(shuffle(data));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const currentCards = deck.slice(deckIndex, deckIndex + 3);

  function toggleReveal(i) {
    setRevealed(r => r.map((v, idx) => (idx === i ? !v : v)));
  }

  function handleNext() {
    const nextIndex = deckIndex + 3;
    if (nextIndex >= deck.length) {
      setDeck(shuffle(words));
      setDeckIndex(0);
    } else {
      setDeckIndex(nextIndex);
    }
    setRevealed([false, false, false]);
  }

  if (loading) return <p className="status-msg">Loading words…</p>;
  if (error) return <p className="error-msg">Error: {error}</p>;
  if (words.length === 0) return <p className="status-msg">No words in the database yet.</p>;

  return (
    <div className="flashcard-page">
      <h2>Flash Cards</h2>
      <div className="cards-grid">
        {currentCards.map((word, i) => (
          <div key={word.id} className="card">
            <div className="card-hanzi">{word.hanzi}</div>
            {revealed[i] ? (
              <div className="card-reveal">
                {word.pinyin && <div className="card-pinyin">{word.pinyin}</div>}
                <div className="card-meaning">{word.meaning}</div>
                {word.explanation && (
                  <div className="card-explanation">{word.explanation}</div>
                )}
              </div>
            ) : null}
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
        <button className="btn btn-primary" onClick={handleNext}>
          Next →
        </button>
      </div>
    </div>
  );
}
