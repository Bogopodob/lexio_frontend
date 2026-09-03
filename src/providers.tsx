import { ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/context/AuthContext'
import CommandPalette from '@/components/CommandPalette'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <BrowserRouter basename="/app">
        <AuthProvider>
          {children}
          <CommandPalette />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
