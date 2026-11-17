import { useState, useEffect, useRef } from 'react';
import { getBreakdown } from '../utils/breakdown.js';

export default function BreakdownPopup({ hanzi, onClose }) {
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getBreakdown(hanzi)
      .then(d => { setBreakdown(d.breakdown); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [hanzi]);

  useEffect(() => {
    function onKeyDown(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function onOverlayMouseDown(e) {
    if (dialogRef.current && !dialogRef.current.contains(e.target)) onClose();
  }

  return (
    <div className="dialog-overlay" onMouseDown={onOverlayMouseDown}>
      <div className="dialog breakdown-dialog" ref={dialogRef}>
        <h3 className="dialog-title">Breakdown: {hanzi}</h3>
        {loading && (
          <div className="breakdown-loading">
            <div className="import-spinner" />
            <p>Asking Claude…</p>
          </div>
        )}
        {error && <p className="dialog-error">{error}</p>}
        {breakdown && (
          <div className="breakdown-content">{breakdown}</div>
        )}
        <div className="dialog-actions">
          <button className="dialog-btn dialog-ok" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
