import { useState, useEffect } from 'react';
import WordFilter from '../components/WordFilter.jsx';

const QUESTION_COUNT = 10;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestion(word, pool) {
  const others = shuffle(pool.filter(w => w.id !== word.id));
  const pinyinChoices  = shuffle([word.pinyin,  ...others.slice(0, 3).map(w => w.pinyin)]);
  const meaningChoices = shuffle([word.meaning, ...others.slice(0, 3).map(w => w.meaning)]);
  return { word, pinyinChoices, meaningChoices };
}

function buildSession(pool) {
  const total  = Math.min(QUESTION_COUNT, pool.length);
  const picked = shuffle(pool).slice(0, total);
  // need at least 4 words for distractors; pad from full pool if needed
  const distPool = pool.length >= 4 ? pool : pool;
  return picked.map(w => buildQuestion(w, distPool));
}

export default function Quiz() {
  const [allWords, setAllWords] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  // null = filter screen
  const [questions, setQuestions]   = useState(null);
  const [activePool, setActivePool] = useState([]);
  const [index, setIndex]           = useState(0);
  const [selectedPinyin,  setSelectedPinyin]  = useState(null);
  const [selectedMeaning, setSelectedMeaning] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults]     = useState([]);
  const [done, setDone]           = useState(false);

  useEffect(() => {
    fetch('/api/words')
      .then(r => r.json())
      .then(data => { setAllWords(data); setLoading(false); })
      .catch(() => { setError('Failed to load words.'); setLoading(false); });
  }, []);

  function handleStart(filtered) {
    setActivePool(filtered);
    setQuestions(buildSession(filtered));
    setIndex(0);
    setSelectedPinyin(null);
    setSelectedMeaning(null);
    setSubmitted(false);
    setResults([]);
    setDone(false);
  }

  function handleRestart() {
    handleStart(activePool);
  }

  function goBackToFilter() {
    setQuestions(null);
    setDone(false);
  }

  if (loading) return <p className="status-msg">Loading…</p>;
  if (error)   return <p className="error-msg">{error}</p>;
  if (allWords.length === 0) return <p className="status-msg">No words in the dictionary yet.</p>;

  if (!questions) return <WordFilter words={allWords} onStart={handleStart} />;

  if (done) {
    return (
      <div className="quiz-review">
        <h2 className="quiz-review-title">
          Results — {results.filter(r => r.correct).length} / {results.length} correct
        </h2>
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
        <div className="quiz-review-actions">
          <button className="quiz-btn" onClick={handleRestart}>Try Again</button>
          <button className="quiz-btn quiz-btn-secondary" onClick={goBackToFilter}>Change Filters</button>
        </div>
      </div>
    );
  }

  const { word, pinyinChoices, meaningChoices } = questions[index];
  const pinyinCorrect  = selectedPinyin  === word.pinyin;
  const meaningCorrect = selectedMeaning === word.meaning;

  function handleSubmit() {
    if (!selectedPinyin || !selectedMeaning) return;
    setSubmitted(true);
  }

  function handleNext() {
    const newResults = [...results, { word, correct: pinyinCorrect && meaningCorrect }];
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
      <div className="page-header-row">
        <div className="quiz-progress">Question {index + 1} / {questions.length}</div>
        <button className="wf-back-btn" onClick={goBackToFilter}>⟵ Change filters</button>
      </div>

      <div className="quiz-hanzi">{word.hanzi}</div>

      <div className="quiz-choices-row">
        <div className="quiz-choices-col">
          <div className="quiz-choices-label">Pinyin</div>
          {pinyinChoices.map(p => {
            let cls = 'quiz-choice';
            if (submitted) {
              if (p === word.pinyin)         cls += ' choice-correct';
              else if (p === selectedPinyin) cls += ' choice-wrong';
            } else if (p === selectedPinyin) {
              cls += ' choice-selected';
            }
            return (
              <button key={p} className={cls} onClick={() => !submitted && setSelectedPinyin(p)}>
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
              if (m === word.meaning)         cls += ' choice-correct';
              else if (m === selectedMeaning) cls += ' choice-wrong';
            } else if (m === selectedMeaning) {
              cls += ' choice-selected';
            }
            return (
              <button key={m} className={cls} onClick={() => !submitted && setSelectedMeaning(m)}>
                {m}
              </button>
            );
          })}
        </div>
      </div>

      <div className="quiz-actions">
        {!submitted ? (
          <button className="quiz-btn" onClick={handleSubmit} disabled={!selectedPinyin || !selectedMeaning}>
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
