import { Effect, Schema } from "effect"
import { readonly, ref } from "vue"
import type { Card, CardId, CardInput } from "@triggertracker/domain"
import { CardsDocument } from "@triggertracker/domain"
import { ApiError, callApi } from "../api/client.ts"
import { useBattlefield } from "./useBattlefield.ts"

const cards = ref<ReadonlyArray<Card>>([])
const loaded = ref(false)

const decodeDocument = Schema.decodeUnknownEffect(Schema.fromJsonString(CardsDocument))

const { loadBattlefield } = useBattlefield()

/** Replace the card list, then refresh the battlefield the server may have pruned. */
async function setCards(list: ReadonlyArray<Card>) {
  cards.value = list
  await loadBattlefield()
}

async function loadCards() {
  cards.value = await callApi((client) => client.cards.list())
  loaded.value = true
}

async function addCard(input: CardInput) {
  const card = await callApi((client) => client.cards.create({ payload: input }))
  cards.value = [...cards.value, card]
  return card
}

async function updateCard(id: CardId, input: CardInput) {
  const card = await callApi((client) => client.cards.update({ params: { id }, payload: input }))
  cards.value = cards.value.map((c) => (c.id === id ? card : c))
  return card
}

async function removeCard(id: CardId) {
  await callApi((client) => client.cards.remove({ params: { id } }))
  await setCards(cards.value.filter((c) => c.id !== id))
}

async function resetToDefaults() {
  await setCards(await callApi((client) => client.cards.reset()))
}

async function exportCards() {
  const document = await callApi((client) => client.cards.export())
  return JSON.stringify(document, null, 2)
}

/** Validate pasted JSON with the shared schema before sending it. */
async function importCards(json: string) {
  const document = await Effect.runPromise(
    decodeDocument(json).pipe(Effect.mapError((error) => new ApiError(error.message, "SchemaError")))
  )
  await setCards(await callApi((client) => client.cards.import({ payload: document })))
}

export function useCards() {
  return {
    cards: readonly(cards),
    loaded: readonly(loaded),
    loadCards,
    addCard,
    updateCard,
    removeCard,
    resetToDefaults,
    exportCards,
    importCards
  }
}
