import { motion } from 'framer-motion'
import Router from '@/router'
import TabBar from '@/components/TabBar'

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
        <Router />
      </div>

      <TabBar />
    </main>
  )
}
