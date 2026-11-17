import { useState } from 'react';

// Controlled tag input. value = string[], onChange = (string[]) => void
export default function TagInput({ value, onChange, placeholder = 'Add tags…' }) {
  const [input, setInput] = useState('');

  function commit(raw) {
    const tag = raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setInput('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(input);
    } else if (e.key === 'Backspace' && input === '') {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="tag-input-wrap">
      {value.map(tag => (
        <span key={tag} className="tag-chip">
          {tag}
          <button
            type="button"
            className="tag-chip-remove"
            onClick={() => onChange(value.filter(t => t !== tag))}
          >×</button>
        </span>
      ))}
      <input
        className="tag-input-field"
        type="text"
        value={input}
        placeholder={value.length === 0 ? placeholder : ''}
        onChange={e => setInput(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(input)}
      />
    </div>
  );
}
