// @ts-nocheck
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faVolumeHigh } from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { useT } from '@/lib/i18n'
import { matchesShortcut, useShortcuts } from '@/lib/shortcuts'

interface FlipCardProps {
  label: string
  labelAccent: string
  icon: IconDefinition
  title: string
  translation: string
  transcription?: string | null
  isFlipped: boolean
  isSpeaking: boolean
  onFlip: () => void
  onSpeak: () => void
}

export default function FlipCard({
  label,
  labelAccent,
  icon,
  title,
  translation,
  transcription,
  isFlipped,
  isSpeaking,
  onFlip,
  onSpeak,
}: FlipCardProps) {
  const { bindings } = useShortcuts()
  const t = useT()
  const handleCardKey = (e) => {
    if (matchesShortcut(e, bindings.flip) || e.key === ' ') {
      e.preventDefault()
      onFlip()
    }
  }
  return (
    <div className="flip-card" style={{ perspective: 1200 }}>
      <motion.div
        className="flip-card__inner"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <article
          className="phrase-card flip-card__face flip-card__face--front"
          onClick={onFlip}
          role="button"
          tabIndex={0}
          aria-label={t('components.flipcard.showTranslation', { title })}
          onKeyDown={(e) => {
            handleCardKey(e)
            if (matchesShortcut(e, bindings.speak)) {
              e.preventDefault()
              onSpeak()
            }
          }}
        >
          <div className="phrase-card__icon">
            <FontAwesomeIcon icon={icon} />
          </div>
          <p className={`phrase-card__label ${labelAccent}`}>{label}</p>
          <h4>{title}</h4>
          {transcription ? (
            <p className="mt-1.5 text-[17px] font-bold text-[#5AD4B5] tabular-nums tracking-wide">
              [{transcription}]
            </p>
          ) : null}
          <p className="phrase-card__hint">{t('components.flipcard.tapToTranslate')}</p>
          <div className="phrase-card__actions">
            <button
              className={`phrase-card__listen ${isSpeaking ? 'phrase-card__listen--active' : ''}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSpeak()
              }}
              aria-label={t('components.flipcard.speak')}
            >
              {isSpeaking ? (
                <span className="phrase-card__wave" aria-hidden="true">
                  <span /><span /><span />
                </span>
              ) : (
                <FontAwesomeIcon icon={faVolumeHigh} />
              )}
              {isSpeaking ? t('components.flipcard.sounding') : t('components.flipcard.listen')}
              <span className="phrase-card__kbd">L</span>
            </button>
            <span className="phrase-card__flip-hint">↻</span>
          </div>
        </article>

        {/* Back */}
        <article
          className="phrase-card flip-card__face flip-card__face--back"
          onClick={onFlip}
          role="button"
          tabIndex={0}
          aria-label={t('components.flipcard.backToOriginal', { text: translation })}
          onKeyDown={handleCardKey}
          style={{ transform: 'rotateY(180deg)' }}
        >
          <div className="phrase-card__icon phrase-card__icon--back">✦</div>
          <p className={`phrase-card__label ${labelAccent}`}>{t('components.flipcard.labelTranslation', { label })}</p>
          <h4 className="phrase-card__translation--large">{translation}</h4>
          <p className="phrase-card__hint">{t('components.flipcard.tapToReturn')}</p>
          <button
            className={`phrase-card__listen ${isSpeaking ? 'phrase-card__listen--active' : ''}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onSpeak()
            }}
          >
            {isSpeaking ? (
              <span className="phrase-card__wave" aria-hidden="true">
                <span /><span /><span />
              </span>
            ) : (
              <FontAwesomeIcon icon={faVolumeHigh} />
            )}
            {isSpeaking ? t('components.flipcard.sounding') : t('components.flipcard.listenOriginal')}
          </button>
        </article>
      </motion.div>
    </div>
  )
}
