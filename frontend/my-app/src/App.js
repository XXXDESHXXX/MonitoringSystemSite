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
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
