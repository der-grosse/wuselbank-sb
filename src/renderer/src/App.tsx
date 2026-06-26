import { useEffect, useRef, useState } from 'react'
import type { CardStatus } from '../../shared/card'

// How long a result (balance or error) stays on screen before the UI resets
// back to the idle "hold your card" prompt.
const RESET_AFTER_MS = 5000

type View = { state: 'idle' } | CardStatus

const wuselFormatter = new Intl.NumberFormat('de-DE')

function App(): React.JSX.Element {
  const [view, setView] = useState<View>({ state: 'idle' })
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const clearResetTimer = (): void => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current)
        resetTimer.current = null
      }
    }

    const unsubscribe = window.api.onCardStatus((status: CardStatus) => {
      clearResetTimer()
      setView(status)

      // After showing a result, return to the idle prompt automatically.
      if (status.state === 'success' || status.state === 'error') {
        resetTimer.current = setTimeout(() => {
          setView({ state: 'idle' })
          resetTimer.current = null
        }, RESET_AFTER_MS)
      }
    })

    return () => {
      clearResetTimer()
      unsubscribe()
    }
  }, [])

  return (
    <div className="terminal">
      <h1 className="brand">Wuselbank</h1>
      <div className={`card-panel ${view.state}`}>{renderView(view)}</div>
    </div>
  )
}

function renderView(view: View): React.JSX.Element {
  switch (view.state) {
    case 'reading':
      return (
        <>
          <div className="spinner" aria-hidden />
          <p className="message">Karte wird gelesen…</p>
        </>
      )
    case 'success':
      return (
        <>
          <p className="message">{view.name ? `Hallo ${view.name}!` : 'Dein Guthaben'}</p>
          <p className="balance">
            {wuselFormatter.format(view.balance)} <span className="unit">Wusel</span>
          </p>
        </>
      )
    case 'error':
      return (
        <>
          <div className="icon-error" aria-hidden>
            !
          </div>
          <p className="message">{view.message}</p>
          <p className="hint">Bitte versuche es noch einmal.</p>
        </>
      )
    case 'idle':
    default:
      return (
        <>
          <div className="nfc-icon" aria-hidden>
            <span className="wave" />
            <span className="wave" />
            <span className="wave" />
          </div>
          <p className="message">Halte deine Karte an das Lesegerät</p>
        </>
      )
  }
}

export default App
