import { useEffect, useRef, useState } from 'react'
import type { CardStatus, Transaction } from '../../shared/card'
import type { AdLists } from '../../shared/ads'
import { onCardStatus } from './cardStatus'

// A result (balance or error) stays on screen as long as the card is on the
// reader, and lingers this long after the card is removed before the UI resets
// back to the idle "hold your card" prompt.
const RESET_AFTER_REMOVAL_MS = 2000

// The screen is not scrollable, so we only show the most recent few.
const MAX_TRANSACTIONS = 4

// How often each placement advances to the next ad.
const AD_CYCLE_MS = 10000
// How often we re-read the ads folder to pick up added/removed images.
const AD_REFRESH_MS = 20000

type View = { state: 'idle' } | CardStatus

const wuselFormatter = new Intl.NumberFormat('de-DE')
const timeFormatter = new Intl.DateTimeFormat('de-DE', {
  hour: '2-digit',
  minute: '2-digit'
})

/** A live wall-clock that re-renders every second. */
function Clock(): React.JSX.Element {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="clock">
      <span className="clock-time">{timeFormatter.format(now)}</span>
    </div>
  )
}

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i])
}

/**
 * Loads the available ads and refreshes the list periodically so images
 * dropped into (or removed from) the ads folder show up without a restart.
 * Keeps the previous array references when nothing changed, so consumers don't
 * needlessly reset their cycle.
 */
function useAds(): AdLists {
  const [ads, setAds] = useState<AdLists>({ top: [], side: [] })

  useEffect(() => {
    let active = true

    const load = async (): Promise<void> => {
      const next = await window.api.listAds()
      if (!active) return
      setAds((prev) =>
        sameList(prev.top, next.top) && sameList(prev.side, next.side) ? prev : next
      )
    }

    void load()
    const id = setInterval(() => void load(), AD_REFRESH_MS)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  return ads
}

/** Shows one ad from `ads`, advancing to the next every `AD_CYCLE_MS`. */
function AdSlot({ ads, className }: { ads: string[]; className: string }): React.JSX.Element {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (ads.length <= 1) return
    const id = setInterval(() => setIndex((i) => (i + 1) % ads.length), AD_CYCLE_MS)
    return () => clearInterval(id)
  }, [ads])

  const src = ads[index % ads.length]
  return (
    <div className={className}>
      <img key={src} className="ad-img" src={src} alt="" />
    </div>
  )
}

/**
 * Fills the left and right columns from the shared side-ad pool, advancing
 * every `AD_CYCLE_MS`. The two columns are always offset so they never show the
 * same ad at the same time (when there are at least two ads).
 */
function SideAds({ ads }: { ads: string[] }): React.JSX.Element {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (ads.length <= 1) return
    const id = setInterval(() => setIndex((i) => (i + 1) % ads.length), AD_CYCLE_MS)
    return () => clearInterval(id)
  }, [ads])

  const n = ads.length
  const leftSrc = ads[index % n]
  // Offset keeps the right ad distinct from the left one (1..n-1, so never 0).
  const rightSrc = n > 1 ? ads[(index + Math.floor(n / 2)) % n] : undefined

  return (
    <>
      <div className="ad-left">
        <img key={leftSrc} className="ad-img" src={leftSrc} alt="" />
      </div>
      <div className="ad-right">
        {rightSrc && <img key={rightSrc} className="ad-img" src={rightSrc} alt="" />}
      </div>
    </>
  )
}

function App(): React.JSX.Element {
  const [view, setView] = useState<View>({ state: 'idle' })
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ads = useAds()

  useEffect(() => {
    const clearResetTimer = (): void => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current)
        resetTimer.current = null
      }
    }

    const unsubscribe = onCardStatus((status: CardStatus) => {
      clearResetTimer()

      // The card was lifted: keep the current result on screen a little longer,
      // then return to the idle prompt. While the card stays on the reader no
      // removal arrives, so the result remains visible indefinitely.
      if (status.state === 'removed') {
        resetTimer.current = setTimeout(() => {
          setView({ state: 'idle' })
          resetTimer.current = null
        }, RESET_AFTER_REMOVAL_MS)
        return
      }

      setView(status)
    })

    return () => {
      clearResetTimer()
      unsubscribe()
    }
  }, [])

  return (
    <div className="app-layout">
      {ads.top.length > 0 && <AdSlot key={ads.top.join('|')} ads={ads.top} className="ad-top" />}
      <main className="main-area">
        <div className="terminal">
          <div className={`card-panel ${view.state}`}>
            <header className="topbar">
              <h1 className="brand">Wuselbank</h1>
              {/* The clock only appears while waiting for a card, never over a
                  result/account view. */}
              {view.state === 'idle' && <Clock />}
            </header>
            <div className="card-content">{renderView(view)}</div>
          </div>
        </div>
      </main>
      {ads.side.length > 0 && <SideAds key={ads.side.join('|')} ads={ads.side} />}
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
          <TransactionList transactions={view.transactions} self={view.name} />
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

function TransactionList({
  transactions,
  self
}: {
  transactions: Transaction[]
  self: string | undefined
}): React.JSX.Element | null {
  if (transactions.length === 0) {
    return <p className="hint">Noch keine Buchungen</p>
  }

  return (
    <ul className="transactions">
      {transactions
        .toReversed()
        .slice(0, MAX_TRANSACTIONS)
        .map((tx) => {
          const incoming = tx.amount > 0
          const counterparty = tx.sender === self ? tx.receiver : tx.sender
          return (
            <li key={tx.transaction_id} className="transaction">
              <span className="tx-party">{counterparty}</span>
              <span className={`tx-amount ${incoming ? 'in' : 'out'}`}>
                {incoming ? '+' : '−'}
                {wuselFormatter.format(Math.abs(tx.amount))} Wusel
              </span>
            </li>
          )
        })}
    </ul>
  )
}

export default App
