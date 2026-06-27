/**
 * Status of a card read, broadcast from the main process to the renderer over
 * the `card-status` IPC channel as the read progresses.
 */
export type CardStatus =
  | { state: 'reading' }
  | { state: 'success'; balance: number; name?: string; transactions: Transaction[] }
  | { state: 'error'; message: string }

export interface Transaction {
  transaction_id: number
  sender: string
  receiver: string
  amount: number
}
