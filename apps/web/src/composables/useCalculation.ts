import { ref, watch } from "vue"
import type { Ref } from "vue"
import type { CalculationResult, SpellCounts } from "@triggertracker/domain"
import { callApi, errorMessage } from "../api/client.ts"
import { useBattlefield } from "./useBattlefield.ts"
import { useCards } from "./useCards.ts"

const DEBOUNCE_MS = 150

/** Recalculate on the server whenever the spells, cards or battlefield change. */
export function useCalculation(spells: Ref<SpellCounts>) {
  const { entries } = useBattlefield()
  const { cards } = useCards()

  const result = ref<CalculationResult | null>(null)
  const error = ref<string | null>(null)

  let timer: ReturnType<typeof setTimeout> | undefined
  let latest = 0

  async function recalculate() {
    const request = ++latest
    try {
      const next = await callApi((client) => client.calculator.calculate({ payload: spells.value }))
      // Drop responses that were overtaken by a newer request.
      if (request !== latest) return
      result.value = next
      error.value = null
    } catch (e) {
      if (request === latest) error.value = errorMessage(e)
    }
  }

  watch([spells, entries, cards], () => {
    clearTimeout(timer)
    timer = setTimeout(recalculate, DEBOUNCE_MS)
  }, { deep: true, immediate: true })

  return { result, error, recalculate }
}
