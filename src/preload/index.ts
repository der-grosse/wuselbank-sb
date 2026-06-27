import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { CardStatus } from '../shared/card'
import type { AdLists } from '../shared/ads'

// Custom APIs for renderer
const api = {
  /**
   * Subscribe to card status updates from the main process.
   * Returns an unsubscribe function.
   */
  onCardStatus: (callback: (status: CardStatus) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: CardStatus): void =>
      callback(status)
    ipcRenderer.on('card-status', listener)
    return () => ipcRenderer.removeListener('card-status', listener)
  },

  /** Fetch the ads currently available in the ads folder. */
  listAds: (): Promise<AdLists> => ipcRenderer.invoke('ads:list'),

  /** Simulate a card read by id, using the real balance-fetch path. */
  simulateCard: (cardId: string | number): Promise<void> =>
    ipcRenderer.invoke('card:simulate', cardId)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
