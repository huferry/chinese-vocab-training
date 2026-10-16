import { useState, useEffect } from 'react';
import WordFilter from '../components/WordFilter.jsx';
import {
  stripTones,
  extractTones,
  applyTones,
  generateWrongToneSets,
} from '../utils/pinyinTones.js';

const QUESTION_COUNT = 10;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build tone options for the correct sound base.
// Uses word.pinyin directly as the correct option to avoid any round-trip
// mismatch from strip → apply reconstruction.
function buildToneOptions(wordPinyin, base, correctTones) {
  const wrongSets = generateWrongToneSets(correctTones, 3);
  const wrongOptions = wrongSets
    .map(t => applyTones(base, t))
    .filter(s => s !== wordPinyin); // guard against accidental collision
  return shuffle([wordPinyin, ...wrongOptions.slice(0, 3)]);
}

// Build tone options for a wrong sound base (all 4 are wrong).
// Use uniform tones 1-4 so they look distinct.
function buildWrongBaseToneOptions(base, syllableCount) {
  return [1, 2, 3, 4].map(t => applyTones(base, Array(syllableCount).fill(t)));
}

function buildQuestion(word, pool) {
  const correctBase  = stripTones(word.pinyin);
  const correctTones = extractTones(word.pinyin);
  const syllableCount = correctTones.length;

  const others = shuffle(
    pool.filter(w => w.id !== word.id && stripTones(w.pinyin) !== correctBase)
  ).slice(0, 3);

  const soundChoices = shuffle([correctBase, ...others.map(w => stripTones(w.pinyin))]);

  // Pre-generate tone options per sound so they stay stable while user deliberates
  const toneOptionsMap = {};
  for (const base of soundChoices) {
    toneOptionsMap[base] = base === correctBase
      ? buildToneOptions(word.pinyin, base, correctTones)
      : buildWrongBaseToneOptions(base, syllableCount);
  }

  return { word, soundChoices, toneOptionsMap, correctBase, correctTones };
}

function buildSession(pool) {
  const total  = Math.min(QUESTION_COUNT, pool.length);
  const picked = shuffle(pool).slice(0, total);
  return picked.map(w => buildQuestion(w, pool));
}

export default function PinyinGame() {
  const [allWords, setAllWords] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const [questions, setQuestions]     = useState(null);
  const [activePool, setActivePool]   = useState([]);
  const [index, setIndex]             = useState(0);
  const [selectedSound, setSelectedSound] = useState(null);
  const [selectedTone, setSelectedTone]   = useState(null);
  const [submitted, setSubmitted]     = useState(false);
  const [results, setResults]         = useState([]);
  const [done, setDone]               = useState(false);

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
    setSelectedSound(null);
    setSelectedTone(null);
    setSubmitted(false);
    setResults([]);
    setDone(false);
  }

  function handleRestart() { handleStart(activePool); }
  function goBackToFilter() { setQuestions(null); setDone(false); }

  function handleSelectSound(base) {
    if (submitted) return;
    if (base === selectedSound) return; // already selected, no change
    setSelectedSound(base);
    setSelectedTone(null); // reset tone when sound changes
  }

  function handleSelectTone(toned) {
    if (submitted) return;
    setSelectedTone(toned);
  }

  function handleSubmit() {
    if (!selectedSound || !selectedTone) return;
    setSubmitted(true);
    const { word } = questions[index];
    const correct = selectedSound === stripTones(word.pinyin) && selectedTone === word.pinyin;
    fetch(`/api/words/${word.id}/confidence`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confident: correct }),
    }).catch(() => {});
  }

  function handleNext() {
    const { word } = questions[index];
    const correct = selectedSound === stripTones(word.pinyin) && selectedTone === word.pinyin;
    const newResults = [...results, { word, correct }];
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (index + 1 >= questions.length) {
      setResults(newResults);
      setDone(true);
    } else {
      setResults(newResults);
      setIndex(index + 1);
      setSelectedSound(null);
      setSelectedTone(null);
      setSubmitted(false);
    }
  }

  if (loading) return <p className="status-msg">Loading…</p>;
  if (error)   return <p className="error-msg">{error}</p>;
  if (allWords.length === 0) return <p className="status-msg">No words in the dictionary yet.</p>;

  if (!questions) return <WordFilter words={allWords} onStart={handleStart} />;

  // ── Results screen ──────────────────────────────────────────────────────────
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

  // ── Question screen ─────────────────────────────────────────────────────────
  const { word, soundChoices, toneOptionsMap } = questions[index];
  const correctBase  = stripTones(word.pinyin);
  const toneOptions  = selectedSound ? toneOptionsMap[selectedSound] : null;

  return (
    <div className="quiz-page">
      <div className="page-header-row">
        <div className="quiz-progress">Question {index + 1} / {questions.length}</div>
        <button className="wf-back-btn" onClick={goBackToFilter}>⟵ Change filters</button>
      </div>

      <div className="quiz-hanzi">{word.hanzi}</div>

      <div className="pinyin-choices-row">
        {/* ── Sound choices (left) ── */}
        <div className="quiz-choices-col">
          <div className="quiz-choices-label">Sound</div>
          {soundChoices.map(base => {
            let cls = 'quiz-choice';
            if (submitted) {
              if (base === correctBase)        cls += ' choice-correct';
              else if (base === selectedSound) cls += ' choice-wrong';
            } else if (base === selectedSound) {
              cls += ' choice-selected';
            }
            return (
              <button key={base} className={cls} onClick={() => handleSelectSound(base)}>
                {base}
              </button>
            );
          })}
        </div>

        {/* ── Tone choices (right) ── */}
        <div className="quiz-choices-col">
          <div className="quiz-choices-label">Tone</div>
          {toneOptions ? (
            toneOptions.map(toned => {
              let cls = 'quiz-choice';
              if (submitted) {
                if (toned === word.pinyin)       cls += ' choice-correct';
                else if (toned === selectedTone) cls += ' choice-wrong';
              } else if (toned === selectedTone) {
                cls += ' choice-selected';
              }
              return (
                <button key={toned} className={cls} onClick={() => handleSelectTone(toned)}>
                  {toned}
                </button>
              );
            })
          ) : (
            <div className="pinyin-tone-placeholder">
              Select a sound first
            </div>
          )}
        </div>
      </div>

      {submitted && (
        <div className={`pinyin-reveal ${selectedTone === word.pinyin ? 'pinyin-reveal-correct' : 'pinyin-reveal-wrong'}`}>
          {selectedTone !== word.pinyin && (
            <div className="pinyin-reveal-answer">
              <span className="pinyin-reveal-label">Correct answer:</span>
              <span className="pinyin-reveal-pinyin">{word.pinyin}</span>
            </div>
          )}
          <div className="pinyin-reveal-meaning">{word.meaning}</div>
        </div>
      )}

      <div className="quiz-actions">
        {!submitted ? (
          <button
            className="quiz-btn"
            onClick={handleSubmit}
            disabled={!selectedSound || !selectedTone}
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
