import { useState, useEffect, useRef } from 'react';
import WordFilter from '../components/WordFilter.jsx';
import { sentenceChatTurn } from '../utils/sentenceChat.js';
import { wordWeight } from '../utils/wordSelection.js';
import { recordPlay } from '../utils/recordPlay.js';

// Render text with **bold** markdown into React elements
function renderText(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickWord(pool) {
  const totalWeight = pool.reduce((s, w) => s + wordWeight(w), 0);
  let r = Math.random() * totalWeight;
  for (const w of pool) {
    r -= wordWeight(w);
    if (r <= 0) return w;
  }
  return pool[pool.length - 1];
}

export default function Sentences() {
  const [allWords, setAllWords] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const [pool, setPool]           = useState(null); // null = filter screen
  const [word, setWord]           = useState(null);
  const [messages, setMessages]   = useState([]);   // [{role, content}]
  const [input, setInput]         = useState('');
  const [lastSent, setLastSent]   = useState('');
  const [sending, setSending]     = useState(false);
  const [roundDone, setRoundDone] = useState(false);
  const [roundResult, setRoundResult] = useState(null); // 'correct' | 'giveup'

  const chatEndRef  = useRef(null);
  const inputRef    = useRef(null);

  useEffect(() => {
    fetch('/api/words')
      .then(r => r.json())
      .then(data => { setAllWords(data); setLoading(false); })
      .catch(() => { setError('Failed to load words.'); setLoading(false); });
  }, []);

  // Scroll chat to bottom whenever messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function startRound(selectedPool, selectedWord) {
    setRoundDone(false);
    setRoundResult(null);
    setMessages([]);
    setInput('');
    setSending(true);
    try {
      const { content, status } = await sentenceChatTurn(selectedWord, []);
      const firstMsg = { role: 'assistant', content };
      setMessages([firstMsg]);
      if (status) finishRound(status, selectedWord, [firstMsg]);
    } catch (err) {
      console.error('Sentence chat error:', err);
      setMessages([{ role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setSending(false);
    }
  }

  function finishRound(status, w, msgs) {
    setRoundDone(true);
    setRoundResult(status);
    const confident = status === 'correct';
    fetch(`/api/words/${w.id}/confidence`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confident, factor: confident ? 1.5 : 1.0 }),
    }).catch(() => {});
  }

  function handleStart(filtered) {
    const selectedWord = pickWord(filtered);
    recordPlay(selectedWord.id);
    setPool(filtered);
    setWord(selectedWord);
    startRound(filtered, selectedWord);
  }

  function handleNextRound() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const selectedWord = pickWord(pool);
    recordPlay(selectedWord.id);
    setWord(selectedWord);
    startRound(pool, selectedWord);
  }

  function goBackToFilter() {
    setPool(null);
    setWord(null);
    setMessages([]);
    setRoundDone(false);
    setRoundResult(null);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setLastSent(text);

    const userMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setSending(true);

    try {
      // Send history excluding the initial context (all messages from this round)
      const { content, status } = await sentenceChatTurn(word, updatedMessages);
      const assistantMsg = { role: 'assistant', content };
      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);
      if (status) finishRound(status, word, finalMessages);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (loading) return <p className="status-msg">Loading…</p>;
  if (error)   return <p className="error-msg">{error}</p>;
  if (allWords.length === 0) return <p className="status-msg">No words in the dictionary yet.</p>;

  if (!pool) return <WordFilter words={allWords} onStart={handleStart} />;

  return (
    <div className="sentences-page">
      <div className="page-header-row">
        <div className="quiz-progress">Sentences</div>
        <button className="wf-back-btn" onClick={goBackToFilter}>⟵ Change filters</button>
      </div>

      {/* Word display */}
      {word && (
        <div className="sentences-word-card">
          <div className="sentences-hanzi">
            <span className="hanzi-badge-wrap">
              {word.hanzi}
              <span className="hsk-badge">HSK {word.level}</span>
            </span>
          </div>
          <div className="sentences-meta">{word.pinyin} · {word.meaning}</div>
        </div>
      )}

      {/* Chat area */}
      <div className="sentences-chat">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble chat-bubble-${msg.role}`}>
            {renderText(msg.content)}
          </div>
        ))}
        {sending && (
          <div className="chat-bubble chat-bubble-assistant chat-bubble-typing">
            <span className="chat-typing-dot" />
            <span className="chat-typing-dot" />
            <span className="chat-typing-dot" />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input or post-round actions */}
      {!roundDone ? (
        <div className="sentences-input-row">
          <div className="sentences-input-wrap">
            {lastSent && (
              <button
                className="sentences-paste-btn"
                title="Paste last answer"
                onClick={() => { setInput(lastSent); inputRef.current?.focus(); }}
              >
                ⎗
              </button>
            )}
            <textarea
              ref={inputRef}
              className={`sentences-input${lastSent ? ' sentences-input-has-paste' : ''}`}
              placeholder="Type your Chinese translation… (Enter to send)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              disabled={sending}
            />
          </div>
          <button
            className="sentences-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || sending}
          >
            ➤
          </button>
        </div>
      ) : (
        <div className={`sentences-round-done ${roundResult}`}>
          <span className="sentences-round-icon">{roundResult === 'correct' ? '✓' : '✗'}</span>
          <div className="sentences-round-actions">
            <button className="quiz-btn" onClick={handleNextRound}>Next sentence</button>
          </div>
        </div>
      )}
    </div>
  );
}
