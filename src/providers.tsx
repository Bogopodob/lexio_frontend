import { ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/context/AuthContext'
import { LocaleProvider } from '@/context/LocaleContext'
import CommandPalette from '@/components/CommandPalette'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>
      <BrowserRouter>
        <AuthProvider>
          {children}
          <CommandPalette />
        </AuthProvider>
      </BrowserRouter>
      </LocaleProvider>
    </ThemeProvider>
  )
}
