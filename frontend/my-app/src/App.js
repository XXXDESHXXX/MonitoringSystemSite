import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import LoadAverage from "./LoadAverage";

function Home() {
  return <h2>Главная страница</h2>;
}

function About() {
  return <h2>О нас</h2>;
}

function App() {
  return (
    <Router>
      <nav>
        <ul>
          <li>
            <Link to="/">Главная</Link>
          </li>
          <li>
            <Link to="/about">О нас</Link>
          </li>
            <li>
                <Link to="/metrics/load-average">Метрики</Link>
            </li>
        </ul>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
          <Route path="/metrics/load-average" element={<LoadAverage />} />
      </Routes>
    </Router>
  );
}

export default App;
