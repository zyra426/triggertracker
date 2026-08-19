import { ref, reactive, computed } from 'vue'

const STORAGE_KEY = 'mtg-tracker-battlefield'
const inPlay = reactive({})
const choiceSelections = reactive({})

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const data = JSON.parse(saved)
      Object.assign(inPlay, data.inPlay || {})
      Object.assign(choiceSelections, data.choiceSelections || {})
    }
  } catch {}
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    inPlay: { ...inPlay },
    choiceSelections: { ...choiceSelections }
  }))
}

export function useBattlefield() {
  loadState()

  function toggleCard(cardName) {
    inPlay[cardName] = !inPlay[cardName]
    saveState()
  }

  function isCardInPlay(cardName) {
    return !!inPlay[cardName]
  }

  function setChoice(cardName, choiceName) {
    choiceSelections[cardName] = choiceName
    saveState()
  }

  function getChoice(cardName) {
    return choiceSelections[cardName] || null
  }

  function resetBattlefield() {
    Object.keys(inPlay).forEach(k => delete inPlay[k])
    Object.keys(choiceSelections).forEach(k => delete choiceSelections[k])
    saveState()
  }

  return {
    inPlay,
    choiceSelections,
    toggleCard,
    isCardInPlay,
    setChoice,
    getChoice,
    resetBattlefield
  }
}
