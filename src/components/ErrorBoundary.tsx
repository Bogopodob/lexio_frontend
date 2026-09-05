import { Component } from 'react'
import type { ReactNode } from 'react'
import { getUiLang, translate } from '@/lib/i18n'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error)
  }

  render() {
    if (this.state.error) {
      const lang = getUiLang()
      return (
        <div className="w-full grid place-items-center py-20 px-6">
          <div className="max-w-md w-full rounded-[20px] border border-[#f43f5e]/25 bg-[#f43f5e]/[0.06] p-6 text-center">
            <div className="text-3xl mb-2">🛠️</div>
            <div className="text-[15px] font-black text-white">{translate(lang, 'components.errorBoundary.title')}</div>
            <p className="text-xs text-white/50 mt-1.5 break-words">
              {this.state.error.message || translate(lang, 'components.errorBoundary.unknown')}
            </p>
            <div className="flex gap-2 justify-center mt-4">
              <button
                onClick={() => this.setState({ error: null })}
                className="px-4 py-2 rounded-full bg-white/[0.08] border border-white/[0.1] text-xs font-bold hover:bg-white/[0.12]"
              >
                {translate(lang, 'common.retry')}
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="px-4 py-2 rounded-full bg-white text-black text-xs font-black"
              >
                {translate(lang, 'components.errorBoundary.home')}
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
