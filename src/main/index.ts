import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { NFC } from 'nfc-pcsc'
import icon from '../../resources/icon.png?asset'
import type { CardStatus } from '../shared/card'
import { fetchBalance } from './api'
import { handleAdProtocol, listAds, registerAdSchemePrivileged } from './ads'

// Custom `ad://` scheme must be registered before the app is ready.
registerAdSchemePrivileged()

// Minimum/maximum time the "reading" state is shown, so the loading animation
// is always visible even when the server responds instantly.
const MIN_READING_MS = 200
const MAX_READING_MS = 1000

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/** Broadcast a card status update to every open window. */
function sendCardStatus(status: CardStatus): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('card-status', status)
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Handle a single card tap: show loading, fetch, then report the result. */
async function handleCard(cardId: string | number): Promise<void> {
  sendCardStatus({ state: 'reading' })

  // Artificial minimum delay so the loading animation is always perceptible.
  const minDuration = MIN_READING_MS + Math.random() * (MAX_READING_MS - MIN_READING_MS)
  const [status] = await Promise.all([fetchBalance(cardId), delay(minDuration)])

  sendCardStatus(status)
}

/** Listen to the PC/SC NFC reader and hand each card tap to `handleCard`. */
function setupNfc(): void {
  const nfc = new NFC()

  nfc.on('reader', (reader) => {
    console.log(`NFC reader connected: ${reader.name}`)

    reader.on('card', (card) => {
      console.log(`Card detected: ${card.uid}`)
      void handleCard(card.uid)
    })

    reader.on('error', (err) => {
      console.error(`NFC reader error (${reader.name}):`, err)
    })

    reader.on('end', () => {
      console.log(`NFC reader disconnected: ${reader.name}`)
    })
  })

  nfc.on('error', (err) => {
    console.error('NFC error:', err)
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  handleAdProtocol()
  ipcMain.handle('ads:list', () => listAds())
  // Dev helper: simulate a card read by id (drives the real fetchBalance path).
  ipcMain.handle('card:simulate', (_event, cardId: string | number) => handleCard(cardId))

  createWindow()

  setupNfc()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
