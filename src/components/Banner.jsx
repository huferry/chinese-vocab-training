import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Banner() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  function closeMenu() {
    setMenuOpen(false);
  }

  function isActive(path) {
    return location.pathname === path ? 'active' : '';
  }

  return (
    <header className="banner">
      <div className="banner-inner">
        <Link to="/" className="banner-brand" onClick={closeMenu}>
          <div className="banner-logo">汉</div>
          <span className="banner-title">Chinese Vocabulary Training</span>
        </Link>
        <button
          className="banner-hamburger"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
        <nav className={`banner-nav${menuOpen ? ' open' : ''}`}>
          <Link to="/flashcard" className={isActive('/flashcard')} onClick={closeMenu}>
            Flash Card
          </Link>
          <Link to="/pinyin" className={isActive('/pinyin')} onClick={closeMenu}>
            Pinyin
          </Link>
          <Link to="/quiz" className={isActive('/quiz')} onClick={closeMenu}>
            Quiz
          </Link>
          <Link to="/sentences" className={isActive('/sentences')} onClick={closeMenu}>
            Sentences
          </Link>
          <Link to="/writing" className={isActive('/writing')} onClick={closeMenu}>
            Writing
          </Link>
          <Link to="/dictionary" className={isActive('/dictionary')} onClick={closeMenu}>
            Dictionary
          </Link>
        </nav>
      </div>
    </header>
  );
}
