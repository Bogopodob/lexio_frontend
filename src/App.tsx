import { motion } from 'framer-motion'
import Router from '@/router'
import AppLayout from '@/widgets/app-layout/ui/AppLayout'

export default function App() {
  return (
    <div className="app-shell">
      <motion.div
        animate={{ x: [0, 20, 0], y: [0, -14, 0] }}
        className="app-shell__orb app-shell__orb--mint"
        transition={{ duration: 14, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />
      <motion.div
        animate={{ x: [0, -24, 0], y: [0, 16, 0] }}
        className="app-shell__orb app-shell__orb--violet"
        transition={{ duration: 16, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />
      <motion.div
        animate={{ scale: [1, 1.06, 1], opacity: [0.28, 0.42, 0.28] }}
        className="app-shell__mesh"
        transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
      />

      <AppLayout>
        <Router />
      </AppLayout>
    </div>
  )
}
