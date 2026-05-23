import { Routes, Route } from 'react-router-dom'
import Home from '@/pages/Home'
import Profile from '@/pages/Profile'
import Stats from '@/pages/Stats'
import Settings from '@/pages/Settings'

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/stats" element={<Stats />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  )
}
