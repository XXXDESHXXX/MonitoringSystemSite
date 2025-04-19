import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import Register from './components/Register';
import Login from './components/Login';
import LoadAverage from "./LoadAverage";
import { AuthProvider, AuthContext } from './AuthContext';
import ProtectedRoute from './ProtectedRoute';
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

function Navbar() {
  const { isAuthenticated, setIsAuthenticated } = useContext(AuthContext);

  const handleLogout = async () => {
    await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
    setIsAuthenticated(false);
  };

  return (
    <nav className="navbar">
      <ul className="nav-list">
        <li className="nav-item">
          <Link to="/"><FaHome className="icon" /></Link>
        </li>
        {!isAuthenticated && (
          <>
            <li className="nav-item"><Link to="/register">Регистрация</Link></li>
            <li className="nav-item"><Link to="/login">Вход</Link></li>
          </>
        )}
        {isAuthenticated && (
          <>
            <li className="nav-item"><Link to="/about">О нас</Link></li>
            <li className="nav-item">
              <Link to="/metrics">Метрики</Link>
              <ul className="dropdown-content">
                <li><Link to="/metrics/memory">Память</Link></li>
                <li><Link to="/metrics/io">I/O</Link></li>
                <li><Link to="/metrics/cpu">CPU</Link></li>
                <li><Link to="/metrics/disk">Нагрузка на диски</Link></li>
              </ul>
            </li>
            <li className="nav-item">
              <button onClick={handleLogout} className="logout-button">Выйти</button>
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
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/about"
            element={<ProtectedRoute><About /></ProtectedRoute>}
          />
          <Route
            path="/metrics"
            element={<ProtectedRoute><LoadAverage /></ProtectedRoute>}
          />
          <Route
            path="/metrics/memory"
            element={<ProtectedRoute><Memory /></ProtectedRoute>}
          />
          <Route
            path="/metrics/io"
            element={<ProtectedRoute><IO /></ProtectedRoute>}
          />
          <Route
            path="/metrics/cpu"
            element={<ProtectedRoute><CPU /></ProtectedRoute>}
          />
          <Route
            path="/metrics/disk"
            element={<ProtectedRoute><Disk /></ProtectedRoute>}
          />
          <Route
            path="/protected"
            element={<ProtectedRoute><h2>Protected content</h2></ProtectedRoute>}
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
