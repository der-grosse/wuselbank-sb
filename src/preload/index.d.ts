import { ElectronAPI } from '@electron-toolkit/preload'
import type { CardStatus } from '../shared/card'
import type { AdLists } from '../shared/ads'

interface Api {
  onCardStatus: (callback: (status: CardStatus) => void) => () => void
  listAds: () => Promise<AdLists>
  simulateCard: (cardId: string | number) => Promise<void>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
