import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Banner from './components/Banner.jsx';
import Home from './pages/Home.jsx';
import FlashCard from './pages/FlashCard.jsx';
import Dictionary from './pages/Dictionary.jsx';
import Quiz from './pages/Quiz.jsx';
import PinyinGame from './pages/Pinyin.jsx';
import Sentences from './pages/Sentences.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Banner />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/flashcard" element={<FlashCard />} />
            <Route path="/pinyin" element={<PinyinGame />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/sentences" element={<Sentences />} />
            <Route path="/dictionary" element={<Dictionary />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
