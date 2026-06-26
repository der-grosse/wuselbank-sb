/**
 * Status of a card read, broadcast from the main process to the renderer over
 * the `card-status` IPC channel as the read progresses.
 */
export type CardStatus =
  | { state: 'reading' }
  | { state: 'success'; balance: number; name?: string }
  | { state: 'error'; message: string }
