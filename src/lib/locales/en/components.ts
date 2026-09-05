import type ruComponents from '../ru/components'

const en: typeof ruComponents = {
  tabbar: {
    home: 'Home',
    stats: 'Statistics',
    profile: 'Profile',
    settings: 'Settings',
    nav: 'Mobile navigation',
  },
  guestBanner: {
    title: 'Guest mode',
    text: ' — progress, streak and words won’t be saved. Sign in to keep everything.',
    cta: 'Sign in / Sign up',
    dismiss: 'Hide',
  },
  requireAuth: {
    checking: 'Checking sign-in…',
  },
  palette: {
    homeLabel: 'Home',
    homeHint: 'Go to home',
    statsLabel: 'Statistics',
    statsHint: 'Your progress',
    profileLabel: 'Profile',
    profileHint: 'Achievements and level',
    settingsLabel: 'Settings',
    settingsHint: 'Language, notifications',
    lessonLabel: 'Continue lesson',
    lessonHint: '12 of 20 words',
    themeLight: 'Light theme',
    themeDark: 'Dark theme',
    themeHint: 'Toggle appearance',
    listenLabel: 'Speak phrase',
    dialogAria: 'Quick search',
    placeholder: 'What are we looking for? Home, phrases, settings…',
    inputAria: 'Search commands',
    empty: 'Nothing found — try “lesson” or “profile”',
    footerSelect: 'navigate',
    footerOpen: 'open',
    footerClose: 'close',
    commandCount: '{n} commands',
  },
  flipcard: {
    showTranslation: '{title} — tap to see translation',
    tapToTranslate: 'Tap to see translation',
    speak: 'Speak phrase',
    sounding: 'Playing…',
    listen: 'Listen',
    backToOriginal: '{text} — tap to go back',
    labelTranslation: '{label} • translation',
    tapToReturn: 'Tap to return to the original',
    listenOriginal: 'Listen to original',
  },
  errorBoundary: {
    title: 'Something broke',
    unknown: 'Unknown render error',
    home: 'Home',
  },
}

export default en
