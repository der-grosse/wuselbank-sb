import { CardStatus, Transaction } from '../shared/card'

interface Account {
  account_name: string
  balance: number
  unlimited: boolean
  account_number: number
  transactions: Transaction[]
  cards: string[]
  cardreaders: number[]
}

// !!! FÜR LUIS: hier das parsing von der ausgelesenen Karten ID zum Wert, der an den Server geschickt wird !!!
function parseCardId(cardId: string): string {
  return cardId.toUpperCase()
}

export async function fetchBalance(cardId: string): Promise<CardStatus> {
  cardId = parseCardId(cardId)
  try {
    const response = await fetch('https://wuselkusen.idot-digital.com/api/accounts', {
      method: 'GET'
    })
    if (!response.ok) {
      return { state: 'error', message: `Server antwortet mit ${response.status}` }
    }
    const accounts = (await response.json()) as Account[]
    const ownAccount = accounts.find((account) => account.cards.includes(cardId))
    if (!ownAccount) {
      return { state: 'error', message: 'Karte nicht gefunden' }
    }
    return {
      state: 'success',
      balance: ownAccount.balance,
      name: ownAccount.account_name,
      transactions: ownAccount.transactions
    }
  } catch {
    return { state: 'error', message: 'Server nicht erreichbar' }
  }
}
