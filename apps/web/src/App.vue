<template>
  <div class="app">
    <header>
      <h1>MTG Trigger Tracker</h1>
    </header>

    <main>
      <div v-if="loadError" class="banner error">
        {{ loadError }}
        <button class="post-combat-btn" @click="load">Retry</button>
      </div>

      <SpellInput
        v-model:instantSorceryCount="instantSorceryCount"
        v-model:otherNonCreatureCount="otherNonCreatureCount"
      />

      <div class="turn-actions">
        <button class="combat-btn" @click="enterCombat" :class="{ active: inCombat }">
          {{ inCombat ? 'In Combat' : 'Move to Combat' }}
        </button>
        <button class="new-turn-btn" @click="newTurn">New Turn</button>
      </div>

      <Battlefield />

      <div v-if="calcError" class="banner error">{{ calcError }}</div>
      <div v-for="warning in result?.warnings ?? []" :key="warning" class="banner warning">{{ warning }}</div>

      <div v-if="inCombat && result" class="combat-section">
        <Results
          :phase="result.preCombat"
          :modifiers="result.modifiers"
        />

        <div class="combat-spells">
          <div class="combat-header">
            <h3>Combat Spells</h3>
            <button class="post-combat-btn" @click="exitCombat">End Combat</button>
          </div>
          <div class="combat-counter">
            <button class="arrow-btn up" @click="combatSpellCount > 0 ? combatSpellCount-- : null" :disabled="combatSpellCount <= 0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M18 15l-6-6-6 6"/>
              </svg>
            </button>
            <div class="counter-value">{{ combatSpellCount }}</div>
            <button class="arrow-btn down" @click="combatSpellCount++">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            <div class="counter-label">I/S in Combat</div>
          </div>
        </div>

        <Results
          v-if="result.combat"
          :phase="result.combat"
          :modifiers="result.modifiers"
          :isCombatUpdate="true"
        />
      </div>

      <div v-if="showPostCombat && result" class="post-combat-summary">
        <h3>Post-Combat Cleanup</h3>
        <p v-if="finalPhase!.tokens.length > 0">Create the following tokens:</p>
        <p v-else>No tokens to create.</p>
        <div v-for="token in finalPhase!.tokens" :key="token.sourceId + token.token.name" class="token-item">
          <span class="token-count">{{ token.count }}x</span>
          <span class="token-type">{{ tokenLabel(token) }}</span>
        </div>
      </div>

      <CardEditor />
    </main>

    <footer>
      <p>Magic: The Gathering is a trademark of Wizards of the Coast.</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { errorMessage } from "./api/client.ts"
import { tokenLabel } from "./format.ts"
import Battlefield from "./components/Battlefield.vue"
import CardEditor from "./components/CardEditor.vue"
import Results from "./components/Results.vue"
import SpellInput from "./components/SpellInput.vue"
import { useBattlefield } from "./composables/useBattlefield.ts"
import { useCalculation } from "./composables/useCalculation.ts"
import { useCards } from "./composables/useCards.ts"

const { loadCards } = useCards()
const { loadBattlefield } = useBattlefield()

const instantSorceryCount = ref(0)
const otherNonCreatureCount = ref(0)
const combatSpellCount = ref(0)
const inCombat = ref(false)
const showPostCombat = ref(false)
const loadError = ref<string | null>(null)

const spells = computed(() => ({
  instantSorcery: instantSorceryCount.value,
  otherNonCreature: otherNonCreatureCount.value,
  combatInstantSorcery: combatSpellCount.value
}))

const { result, error: calcError } = useCalculation(spells)

/** The turn's totals, including spells cast in combat. */
const finalPhase = computed(() => result.value && (result.value.combat ?? result.value.preCombat))

function enterCombat() {
  inCombat.value = true
  showPostCombat.value = false
  combatSpellCount.value = 0
}

function exitCombat() {
  inCombat.value = false
  showPostCombat.value = true
}

function newTurn() {
  instantSorceryCount.value = 0
  otherNonCreatureCount.value = 0
  combatSpellCount.value = 0
  inCombat.value = false
  showPostCombat.value = false
}

async function load() {
  try {
    await Promise.all([loadCards(), loadBattlefield()])
    loadError.value = null
  } catch (e) {
    loadError.value = errorMessage(e)
  }
}

onMounted(load)
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0f0f1a;
  color: #e0e0e0;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.app {
  max-width: 100%;
  min-height: 100vh;
  padding: 1rem;
}

header {
  text-align: center;
  margin-bottom: 1rem;
}

header h1 {
  font-size: 1.4rem;
  font-weight: 700;
}

main {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.combat-btn {
  width: 100%;
  padding: 0.85rem;
  margin-bottom: 0.5rem;
  border: 2px solid #3b82f6;
  border-radius: 12px;
  background: #1a1a2e;
  color: #3b82f6;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.combat-btn:active {
  transform: scale(0.98);
}

.combat-btn.active {
  background: #3b82f6;
  color: white;
}

.combat-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.combat-spells {
  background: #12121f;
  border: 1px solid #2a2a3e;
  border-radius: 12px;
  padding: 1rem;
}

.combat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.combat-header h3 {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
}

.post-combat-btn {
  padding: 0.35rem 0.75rem;
  border: 1px solid #555;
  border-radius: 6px;
  background: transparent;
  color: #aaa;
  font-size: 0.75rem;
  cursor: pointer;
}

.post-combat-btn:active {
  background: #2a2a3e;
}

.combat-counter {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.arrow-btn {
  width: 48px;
  height: 48px;
  border: 2px solid #444;
  border-radius: 12px;
  background: #1a1a2e;
  color: #e0e0e0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.arrow-btn:active:not(:disabled) {
  transform: scale(0.92);
  background: #2a2a4e;
}

.arrow-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.arrow-btn svg {
  width: 24px;
  height: 24px;
}

.counter-value {
  width: 64px;
  text-align: center;
  font-size: 2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  padding: 0.25rem 0;
}

.counter-label {
  font-size: 0.85rem;
  color: #888;
  font-weight: 500;
}

.post-combat-summary {
  background: #1a2e1a;
  border: 1px solid #2d4a2d;
  border-radius: 12px;
  padding: 1rem;
}

.post-combat-summary h3 {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #4ade80;
  margin-bottom: 0.5rem;
}

.post-combat-summary p {
  font-size: 0.85rem;
  color: #aaa;
  margin-bottom: 0.5rem;
}

.token-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
}

.token-count {
  font-weight: 700;
  color: #4ade80;
}

.token-type {
  font-weight: 600;
}

footer {
  margin-top: 2rem;
  text-align: center;
  font-size: 0.65rem;
  color: #444;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.turn-actions {
  display: flex;
  gap: 0.5rem;
}

.turn-actions .combat-btn {
  flex: 1;
}

.new-turn-btn {
  padding: 0.85rem 1rem;
  margin-bottom: 0.5rem;
  border: 2px solid #444;
  border-radius: 12px;
  background: #1a1a2e;
  color: #aaa;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.new-turn-btn:active {
  transform: scale(0.98);
}

.banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
}

.banner.error {
  border: 1px solid #7f1d1d;
  background: #2a1215;
  color: #fca5a5;
}

.banner.warning {
  border: 1px solid #78350f;
  background: #2a1f0e;
  color: #fbbf24;
}

.post-combat-summary {
  margin-top: 1rem;
}
</style>
