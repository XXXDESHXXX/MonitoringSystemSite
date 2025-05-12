// src/App.js

import React, { useContext } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link
} from 'react-router-dom'
import { FaHome, FaUserShield, FaCog } from 'react-icons/fa'

import Register               from './components/Register'
import Login                  from './components/Login'
import MetricsList            from './components/MetricsList'
import LoadAverage            from './components/LoadAverage'
import NodeCPUSecondsTotal    from './components/NodeCPUSecondsTotal'
import NodeMemoryFreeBytes    from './components/NodeMemoryFreeBytes'
import NodeMemoryTotalBytes   from './components/NodeMemoryTotalBytes'
import NodeCPUUsagePercent    from './components/NodeCPUUsagePercent'
import NodeDiskReadBytes      from './components/NodeDiskReadBytes'
import NodeDiskWriteBytes     from './components/NodeDiskWriteBytes'
import NodeMemoryCachedBytes  from './components/NodeMemoryCachedBytes'
import NodeDiskIOTime         from './components/NodeDiskIOTime'
import NodeUptime             from './components/NodeUptime'
import NodeNetworkTransmit    from './components/NodeNetworkTransmit'
import NodeNetworkReceive     from './components/NodeNetworkReceive'
import NodeDiskUsagePercent   from './components/NodeDiskUsagePercent'
import NodeMemoryUsagePercent from './components/NodeMemoryUsagePercent'
import NodeProcessCount       from './components/NodeProcessCount'
import Favorites              from './components/Favorites'
import AdminPanel             from './components/AdminPanel'
import EmailSettings          from './components/EmailSettings'

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
  const [settingsOpen, setSettingsOpen] = React.useState(false)

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
              <button className="settings-button" onClick={() => setSettingsOpen(true)}>
                <FaCog className="icon" /> Настройки
              </button>
            </li>
            <li className="nav-item">
              <button onClick={logout} className="logout-button">
                Выйти
              </button>
            </li>
          </>
        )}
      </ul>
      <EmailSettings isOpen={settingsOpen} setIsOpen={setSettingsOpen} />
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
          <Route
            path="/metrics/node_memory_total_bytes"
            element={
              <ProtectedRoute>
                <NodeMemoryTotalBytes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/metrics/node_cpu_usage_percent"
            element={
              <ProtectedRoute>
                <NodeCPUUsagePercent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/metrics/node_disk_read_bytes"
            element={
              <ProtectedRoute>
                <NodeDiskReadBytes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/metrics/node_disk_write_bytes"
            element={
              <ProtectedRoute>
                <NodeDiskWriteBytes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/metrics/node_memory_cached_bytes"
            element={
              <ProtectedRoute>
                <NodeMemoryCachedBytes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/metrics/node_disk_io_time"
            element={
              <ProtectedRoute>
                <NodeDiskIOTime />
              </ProtectedRoute>
            }
          />
          <Route
            path="/metrics/node_uptime"
            element={
              <ProtectedRoute>
                <NodeUptime />
              </ProtectedRoute>
            }
          />
          <Route
            path="/metrics/node_network_transmit_bytes"
            element={
              <ProtectedRoute>
                <NodeNetworkTransmit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/metrics/node_network_receive_bytes"
            element={
              <ProtectedRoute>
                <NodeNetworkReceive />
              </ProtectedRoute>
            }
          />
          <Route
            path="/metrics/node_disk_usage_percent"
            element={
              <ProtectedRoute>
                <NodeDiskUsagePercent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/metrics/node_memory_usage_percent"
            element={
              <ProtectedRoute>
                <NodeMemoryUsagePercent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/metrics/node_process_count"
            element={
              <ProtectedRoute>
                <NodeProcessCount />
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
