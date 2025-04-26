// src/App.js
import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import Register from './components/Register';
import Login from './components/Login';
import MetricsList from './components/MetricsList';
import LoadAverage from './components/LoadAverage';
import NodeCPUSecondsTotal from './components/NodeCPUSecondsTotal';
import { AuthProvider, AuthContext } from './AuthContext';
import Favorites from './components/Favorites';
import ProtectedRoute from './ProtectedRoute';
import './App.css';
import NodeMemoryFreeBytes from "./components/NodeMemoryFreeBytes";

function Home() { return <Favorites />;; }
function About() { return <h2>О нас</h2>; }

function Navbar() {
  const { isAuthenticated, logout } = useContext(AuthContext);
  return (
    <nav className="navbar">
      <ul className="nav-list">
        <li className="nav-item">
          <Link to="/"><FaHome className="icon" /></Link>
        </li>
        {!isAuthenticated ? (
          <>
            <li className="nav-item">
              <Link to="/register">Регистрация</Link>
            </li>
            <li className="nav-item">
              <Link to="/login">Вход</Link>
            </li>
          </>
        ) : (
          <>
            <li className="nav-item">
              <Link to="/about">О нас</Link>
            </li>
            <li className="nav-item">
              <Link to="/metrics">Метрики</Link>
            </li>
            <li className="nav-item">
              <button onClick={logout} className="logout-button">Выйти</button>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<ProtectedRoute><Home/></ProtectedRoute>} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/about" element={<ProtectedRoute><About/></ProtectedRoute>} />
          <Route path="/metrics" element={<ProtectedRoute><MetricsList/></ProtectedRoute>} />
          <Route path="/metrics/load_average" element={<ProtectedRoute><LoadAverage/></ProtectedRoute>} />
          <Route path="/metrics/node_cpu_seconds_total" element={<ProtectedRoute><NodeCPUSecondsTotal/></ProtectedRoute>} />
          <Route path="/metrics/node_memory_memfree_bytes" element={<ProtectedRoute><NodeMemoryFreeBytes/></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
