import { reactive } from "vue"
import type { BattlefieldEntry, CardId } from "@triggertracker/domain"
import { callApi } from "../api/client.ts"

interface EntryState {
  inPlay: boolean
  choice: string | null
}

const entries = reactive(new Map<CardId, EntryState>())

const setEntries = (list: ReadonlyArray<BattlefieldEntry>) => {
  entries.clear()
  for (const entry of list) {
    entries.set(entry.cardId, { inPlay: entry.inPlay, choice: entry.choice })
  }
}

async function loadBattlefield() {
  setEntries(await callApi((client) => client.battlefield.list()))
}

/** Optimistically apply a change, rolling back if the server rejects it. */
async function update(cardId: CardId, change: Partial<EntryState>) {
  const previous = entries.get(cardId)
  entries.set(cardId, { inPlay: false, choice: null, ...previous, ...change })
  try {
    const saved = await callApi((client) => client.battlefield.update({ params: { cardId }, payload: change }))
    entries.set(cardId, { inPlay: saved.inPlay, choice: saved.choice })
  } catch (error) {
    if (previous) entries.set(cardId, previous)
    else entries.delete(cardId)
    throw error
  }
}

export function useBattlefield() {
  return {
    entries,
    loadBattlefield,
    isCardInPlay: (cardId: CardId) => entries.get(cardId)?.inPlay ?? false,
    getChoice: (cardId: CardId) => entries.get(cardId)?.choice ?? null,
    toggleCard: (cardId: CardId) => update(cardId, { inPlay: !(entries.get(cardId)?.inPlay ?? false) }),
    setChoice: (cardId: CardId, choice: string | null) => update(cardId, { choice }),
    async resetBattlefield() {
      await callApi((client) => client.battlefield.reset())
      entries.clear()
    }
  }
}
