import type ruNotfound from '../ru/notfound'

const en: typeof ruNotfound = {
  check: {
    title: 'grammar-check — live',
    student: 'student writes',
    correct: 'correct',
    notes: [
      'age — only with to be',
      'he / she / it → verb + s',
      'their — theirs, there — over there',
      'agree — no to be',
      'stress on И',
    ],
  },
  quiz: {
    title: 'Translate the word',
    score: 'score',
    error: 'Words failed to load — the page is lost anyway',
    retry: 'Try again',
    foot: 'click or keys 1–4 • words from the dictionary',
  },
  hero: {
    aria: 'Error 404',
    textStart: 'We never learned this word either — ',
    textAccent: 'the page does not exist',
    home: 'Home',
    back: 'Back',
  },
  hint: 'but word reviews run on schedule, no delays',
}

export default en
