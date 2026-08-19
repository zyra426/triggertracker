import { ref, readonly } from 'vue'

const STORAGE_KEY = 'mtg-tracker-cards'
const cards = ref([])
const loaded = ref(false)

export function useCardDatabase() {
  async function loadCards() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        cards.value = JSON.parse(saved)
      } else {
        const res = await fetch('/cards.json')
        const data = await res.json()
        cards.value = data.cards
        saveCards()
      }
    } catch (e) {
      console.error('Failed to load cards:', e)
      cards.value = []
    }
    loaded.value = true
  }

  function saveCards() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cards: cards.value }))
  }

  function addCard(card) {
    cards.value.push(card)
    saveCards()
  }

  function updateCard(index, card) {
    cards.value[index] = card
    saveCards()
  }

  function removeCard(index) {
    cards.value.splice(index, 1)
    saveCards()
  }

  function resetToDefaults() {
    localStorage.removeItem(STORAGE_KEY)
    loadCards()
  }

  function exportCards() {
    return JSON.stringify({ cards: cards.value }, null, 2)
  }

  function importCards(jsonString) {
    try {
      const data = JSON.parse(jsonString)
      if (data.cards && Array.isArray(data.cards)) {
        cards.value = data.cards
        saveCards()
        return true
      }
      return false
    } catch {
      return false
    }
  }

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
