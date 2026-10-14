import { useState, useEffect } from 'react';

const QUESTION_COUNT = 10;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestion(word, allWords) {
  const others = shuffle(allWords.filter(w => w.id !== word.id));
  const pinyinChoices = shuffle([word.pinyin, ...others.slice(0, 3).map(w => w.pinyin)]);
  const meaningChoices = shuffle([word.meaning, ...others.slice(0, 3).map(w => w.meaning)]);
  return { word, pinyinChoices, meaningChoices };
}

export default function Quiz() {
  const [words, setWords] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selectedPinyin, setSelectedPinyin] = useState(null);
  const [selectedMeaning, setSelectedMeaning] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState([]);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/words')
      .then(r => r.json())
      .then(data => {
        setWords(data);
        const total = Math.min(QUESTION_COUNT, data.length);
        const picked = shuffle(data).slice(0, total);
        setQuestions(picked.map(w => buildQuestion(w, data)));
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load words.');
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="status-msg">Loading…</p>;
  if (error)   return <p className="error-msg">{error}</p>;
  if (questions.length === 0) return <p className="status-msg">No words in the dictionary yet.</p>;

  if (done) {
    return (
      <div className="quiz-review">
        <h2 className="quiz-review-title">Results — {results.filter(r => r.correct).length} / {results.length} correct</h2>
        <div className="quiz-review-list">
          {results.map((r, i) => (
            <div key={i} className={`quiz-review-item ${r.correct ? 'correct' : 'incorrect'}`}>
              <span className="review-hanzi">{r.word.hanzi}</span>
              <span className="review-pinyin">{r.word.pinyin}</span>
              <span className="review-meaning">{r.word.meaning}</span>
              <span className="review-badge">{r.correct ? '✓' : '✗'}</span>
            </div>
          ))}
        </div>
        <button className="quiz-btn" onClick={() => {
          const total = Math.min(QUESTION_COUNT, words.length);
          const picked = shuffle(words).slice(0, total);
          setQuestions(picked.map(w => buildQuestion(w, words)));
          setIndex(0);
          setResults([]);
          setSelectedPinyin(null);
          setSelectedMeaning(null);
          setSubmitted(false);
          setDone(false);
        }}>
          Try Again
        </button>
      </div>
    );
  }

  const { word, pinyinChoices, meaningChoices } = questions[index];
  const pinyinCorrect = selectedPinyin === word.pinyin;
  const meaningCorrect = selectedMeaning === word.meaning;

  function handleSubmit() {
    if (!selectedPinyin || !selectedMeaning) return;
    setSubmitted(true);
  }

  function handleNext() {
    const correct = pinyinCorrect && meaningCorrect;
    const newResults = [...results, { word, correct }];
    if (index + 1 >= questions.length) {
      setResults(newResults);
      setDone(true);
    } else {
      setResults(newResults);
      setIndex(index + 1);
      setSelectedPinyin(null);
      setSelectedMeaning(null);
      setSubmitted(false);
    }
  }

  return (
    <div className="quiz-page">
      <div className="quiz-progress">
        Question {index + 1} / {questions.length}
      </div>

      <div className="quiz-hanzi">{word.hanzi}</div>

      <div className="quiz-choices-row">
        <div className="quiz-choices-col">
          <div className="quiz-choices-label">Pinyin</div>
          {pinyinChoices.map(p => {
            let cls = 'quiz-choice';
            if (submitted) {
              if (p === word.pinyin) cls += ' choice-correct';
              else if (p === selectedPinyin) cls += ' choice-wrong';
            } else if (p === selectedPinyin) {
              cls += ' choice-selected';
            }
            return (
              <button
                key={p}
                className={cls}
                onClick={() => !submitted && setSelectedPinyin(p)}
              >
                {p}
              </button>
            );
          })}
        </div>

        <div className="quiz-choices-col">
          <div className="quiz-choices-label">Meaning</div>
          {meaningChoices.map(m => {
            let cls = 'quiz-choice';
            if (submitted) {
              if (m === word.meaning) cls += ' choice-correct';
              else if (m === selectedMeaning) cls += ' choice-wrong';
            } else if (m === selectedMeaning) {
              cls += ' choice-selected';
            }
            return (
              <button
                key={m}
                className={cls}
                onClick={() => !submitted && setSelectedMeaning(m)}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      <div className="quiz-actions">
        {!submitted ? (
          <button
            className="quiz-btn"
            onClick={handleSubmit}
            disabled={!selectedPinyin || !selectedMeaning}
          >
            Submit
          </button>
        ) : (
          <button className="quiz-btn" onClick={handleNext}>
            {index + 1 >= questions.length ? 'See Results' : 'Next'}
          </button>
        )}
      </div>
    </div>
  );
}
