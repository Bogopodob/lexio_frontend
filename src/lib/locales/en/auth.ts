import type ruAuth from '../ru/auth'

const en: typeof ruAuth = {
  checking: 'Checking sign-in…',
  returning: 'Already signed in — taking you back…',
  brandTag: 'learn languages',
  phrases: [
    'Learn 20 words today',
    'Speak without pauses',
    '14 days in a row',
    'Мир — это peace и world',
  ],
  subtitle: 'Words with meanings, movie examples and smart reviews — all in one place.',
  stats: {
    words: 'dictionary words',
    languages: 'languages',
    streak: 'days — top streak',
  },
  guest: 'Continue as guest →',
  sideCaption: '16 words · 7 languages · one sphere',
  card: {
    tabLogin: 'Sign in',
    tabRegister: 'Sign up',
    subLogin: 'Welcome back! Picking up where you left off.',
    subRegister: 'A couple of minutes — and the whole word library is yours.',
    fieldName: 'Name',
    fieldEmail: 'Email',
    fieldPassword: 'Password',
    emailError: 'looks like a typo in the email',
    passwordError: 'at least 8 characters',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    capsLock: 'Caps Lock is on',
    strength: ['weak', 'meh', 'decent', 'strong'],
    serverDown: 'Server unreachable — is the backend running?',
    genericError: 'Something went wrong',
    submitLogin: 'Sign in',
    submitRegister: 'Create account',
    submitting: 'Opening the dictionary…',
    success: 'Done!',
    footnote: 'By pressing the button you accept the magic of spaced repetition ✨',
  },
}

export default en
