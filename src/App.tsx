import { Routes, Route } from 'react-router-dom'
import { motion } from 'framer-motion'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Stats from './pages/Stats'
import Settings from './pages/Settings'
import TabBar from './components/TabBar'

export default function App() {
  return (
    <main className="app-shell">
      <motion.div
        animate={{ x: [0, 16, 0], y: [0, -8, 0] }}
        className="app-shell__orb app-shell__orb--mint"
        transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />
      <motion.div
        animate={{ x: [0, -18, 0], y: [0, 12, 0] }}
        className="app-shell__orb app-shell__orb--violet"
        transition={{ duration: 14, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.32, 0.44, 0.32] }}
        className="app-shell__mesh"
        transition={{ duration: 10, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />

      <div className="phone-frame page-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>

      <TabBar />
    </main>
  )
}
