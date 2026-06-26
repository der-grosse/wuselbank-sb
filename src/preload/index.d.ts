import { ElectronAPI } from '@electron-toolkit/preload'
import type { CardStatus } from '../shared/card'

interface Api {
  onCardStatus: (callback: (status: CardStatus) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
