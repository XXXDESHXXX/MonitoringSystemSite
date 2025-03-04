import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import LoadAverage from "./LoadAverage";
import './App.css';

function Home() {
  return <h2>Главная страница</h2>;
}

function About() {
  return <h2>О нас</h2>;
}

function Memory() {
  return <h2>Память</h2>;
}
function IO() {
  return <h2>I/O</h2>;
}
function CPU() {
  return <h2>CPU</h2>;
}
function Disk() {
  return <h2>Нагрузка на диски</h2>;
}

function App() {
  return (
    <Router>
      <nav className="navbar">
        <ul className="nav-list">
          <li className="nav-item">
            <Link to="/">
              <FaHome className="icon" />
            </Link>
          </li>

          <li className="nav-item">
            <Link to="/about">О нас</Link>
          </li>

          <li className="nav-item">
            <Link to="/metrics">Метрики</Link>
            <ul className="dropdown-content">
              <li><Link to="/metrics/memory">Память</Link></li>
              <li><Link to="/metrics/io">I/O</Link></li>
              <li><Link to="/metrics/cpu">CPU</Link></li>
              <li><Link to="/metrics/disk">Нагрузка на диски</Link></li>
            </ul>
          </li>
        </ul>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />

        <Route path="/metrics" element={<LoadAverage />} />

        <Route path="/metrics/memory" element={<Memory />} />
        <Route path="/metrics/io" element={<IO />} />
        <Route path="/metrics/cpu" element={<CPU />} />
        <Route path="/metrics/disk" element={<Disk />} />
      </Routes>
    </Router>
  );
}

export default App;