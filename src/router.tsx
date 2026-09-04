import { Routes, Route } from 'react-router-dom'
import Home from '@/pages/Home'
import Profile from '@/pages/Profile'
import Stats from '@/pages/Stats'
import Settings from '@/pages/Settings'
import Auth from '@/pages/Auth'
import RequireAuth from '@/components/RequireAuth'

export default function Router() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/" element={<Home />} />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <Profile />
          </RequireAuth>
        }
      />
      <Route path="/stats" element={<Stats />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  )
}
