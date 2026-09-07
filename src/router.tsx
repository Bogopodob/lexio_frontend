import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Home from '@/pages/Home'
import Profile from '@/pages/Profile'
import Stats from '@/pages/Stats'
import Settings from '@/pages/Settings'
import Auth from '@/pages/Auth'
import Learn from '@/pages/Learn'
import Premium from '@/pages/Premium'
import TopicDetail from '@/pages/TopicDetail'
import NotFound from '@/pages/NotFound'
import RequireAuth from '@/components/RequireAuth'

/** Legacy base path: vite base was '/app/' for a while, bookmarks may point there. */
function AppPrefixRedirect() {
  const { pathname, search, hash } = useLocation()
  const rest = pathname.replace(/^\/app\/?/, '')
  return <Navigate to={`/${rest}${search}${hash}`} replace />
}

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
      <Route path="/premium" element={<Premium />} />
      <Route
        path="/learn"
        element={
          <RequireAuth>
            <Learn />
          </RequireAuth>
        }
      />
      <Route
        path="/topics/:id"
        element={
          <RequireAuth>
            <TopicDetail />
          </RequireAuth>
        }
      />
      <Route path="*" element={<NotFound />} />
      <Route path="/app" element={<AppPrefixRedirect />} />
      <Route path="/app/*" element={<AppPrefixRedirect />} />
    </Routes>
  )
}
