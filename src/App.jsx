import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Banner from './components/Banner.jsx';
import Home from './pages/Home.jsx';
import FlashCard from './pages/FlashCard.jsx';
import Dictionary from './pages/Dictionary.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Banner />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/flashcard" element={<FlashCard />} />
            <Route path="/dictionary" element={<Dictionary />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
