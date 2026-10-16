<template>
  <div class="battlefield">
    <div class="section-header" @click="isOpen = !isOpen">
      <span class="section-title">Cards in Play</span>
      <span class="active-count" v-if="activeCount > 0">{{ activeCount }}</span>
      <svg class="chevron" :class="{ open: isOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </div>

    <div v-if="isOpen && error" class="error">{{ error }}</div>

    <div v-if="isOpen" class="card-grid">
      <div
        v-for="card in cards"
        :key="card.id"
        class="card-toggle"
        :class="{ active: isCardInPlay(card.id) }"
        @click="run(() => toggleCard(card.id))"
      >
        <div class="card-main">
          <span class="card-name">{{ card.name }}</span>
          <span class="card-check" v-if="isCardInPlay(card.id)">&#10003;</span>
        </div>
        <div
          v-if="card.choices && card.choices.length > 0 && isCardInPlay(card.id)"
          class="choice-select"
          @click.stop
        >
          <button
            v-for="choice in card.choices"
            :key="choice.name"
            class="choice-btn"
            :class="{ selected: getChoice(card.id) === choice.name }"
            @click="run(() => setChoice(card.id, choice.name))"
          >
            {{ choice.name }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { errorMessage } from "../api/client.ts"
import { useBattlefield } from "../composables/useBattlefield.ts"
import { useCards } from "../composables/useCards.ts"

const { cards } = useCards()
const { isCardInPlay, getChoice, toggleCard, setChoice } = useBattlefield()

const isOpen = ref(false)
const error = ref<string | null>(null)

const activeCount = computed(() => cards.value.filter((c) => isCardInPlay(c.id)).length)

async function run(action: () => Promise<void>) {
  try {
    await action()
    error.value = null
  } catch (e) {
    error.value = errorMessage(e)
  }
}
</script>

<style scoped>
.battlefield {
  margin-bottom: 0.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.section-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #aaa;
}

.active-count {
  background: #4ade80;
  color: #0f0f1a;
  font-size: 0.7rem;
  font-weight: 700;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chevron {
  width: 16px;
  height: 16px;
  color: #666;
  transition: transform 0.2s;
  margin-left: auto;
}

.chevron.open {
  transform: rotate(90deg);
}

.card-grid {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-bottom: 0.5rem;
}

.card-toggle {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid #2a2a3e;
  border-radius: 8px;
  background: #12121f;
  cursor: pointer;
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.card-toggle:active {
  transform: scale(0.98);
}

.card-toggle.active {
  border-color: #4ade80;
  background: #0f1f0f;
}

.card-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-name {
  font-size: 0.9rem;
  font-weight: 500;
}

.card-check {
  color: #4ade80;
  font-weight: 700;
  font-size: 1rem;
}

.choice-select {
  display: flex;
  gap: 0.5rem;
}

.choice-btn {
  flex: 1;
  padding: 0.4rem;
  border: 1px solid #333;
  border-radius: 6px;
  background: #1a1a2e;
  color: #aaa;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
}

.choice-btn.selected {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.error {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #7f1d1d;
  border-radius: 8px;
  background: #2a1215;
  color: #fca5a5;
  font-size: 0.8rem;
}
</style>
