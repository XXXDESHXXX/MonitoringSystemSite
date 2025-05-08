// src/App.js

import React, { useContext } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link
} from 'react-router-dom'
import { FaHome, FaUserShield } from 'react-icons/fa'

import Register               from './components/Register'
import Login                  from './components/Login'
import MetricsList            from './components/MetricsList'
import LoadAverage            from './components/LoadAverage'
import NodeCPUSecondsTotal    from './components/NodeCPUSecondsTotal'
import NodeMemoryFreeBytes    from './components/NodeMemoryFreeBytes'
import Favorites              from './components/Favorites'
import AdminPanel             from './components/AdminPanel'

import { AuthProvider, AuthContext } from './AuthContext'
import ProtectedRoute               from './ProtectedRoute'
import './App.css'

function Home() {
  return <Favorites />
}

function About() {
  return <h2>О нас</h2>
}

function Navbar() {
  const { isAuthenticated, user, logout } = useContext(AuthContext)

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
              <Link to="/about">О нас {user ? "+": "-"}</Link>
            </li>
            <li className="nav-item">
              <Link to="/metrics">Метрики</Link>
            </li>
            {user?.role === 'admin' && (
              <li className="nav-item">
                <Link to="/admin">
                  <FaUserShield className="icon" /> Админ
                </Link>
              </li>
            )}
            <li className="nav-item">
              <button onClick={logout} className="logout-button">
                Выйти
              </button>
            </li>
          </>
        )}
      </ul>
    </nav>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route path="/register" element={<Register />} />
          <Route path="/login"    element={<Login />} />

          <Route
            path="/about"
            element={
              <ProtectedRoute>
                <About />
              </ProtectedRoute>
            }
          />

          <Route
            path="/metrics"
            element={
              <ProtectedRoute>
                <MetricsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/metrics/load_average"
            element={
              <ProtectedRoute>
                <LoadAverage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/metrics/node_cpu_seconds_total"
            element={
              <ProtectedRoute>
                <NodeCPUSecondsTotal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/metrics/node_memory_memfree_bytes"
            element={
              <ProtectedRoute>
                <NodeMemoryFreeBytes />
              </ProtectedRoute>
            }
          />

          {/* Админ-панель: только залогиненный с ролью admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          {/* Фоллбек на 404 */}
          <Route path="*" element={<h2>Страница не найдена</h2>} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}
