<template>
  <div class="spell-input">
    <div class="counter-row">
      <div class="counter">
        <button class="arrow-btn up" @click="decrement('instant')" :disabled="instantSorceryCount <= 0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 15l-6-6-6 6"/>
          </svg>
        </button>
        <div class="counter-value">{{ instantSorceryCount }}</div>
        <button class="arrow-btn down" @click="increment('instant')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        <div class="counter-label">I/S</div>
      </div>
      <div class="counter">
        <button class="arrow-btn up" @click="decrement('other')" :disabled="otherNonCreatureCount <= 0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 15l-6-6-6 6"/>
          </svg>
        </button>
        <div class="counter-value">{{ otherNonCreatureCount }}</div>
        <button class="arrow-btn down" @click="increment('other')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        <div class="counter-label">Other</div>
      </div>
    </div>
    <div class="total">Total: {{ totalSpells }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const instantSorceryCount = defineModel('instantSorceryCount', { type: Number, default: 0 })
const otherNonCreatureCount = defineModel('otherNonCreatureCount', { type: Number, default: 0 })

const totalSpells = computed(() => instantSorceryCount.value + otherNonCreatureCount.value)

function increment(type) {
  if (type === 'instant') instantSorceryCount.value++
  else otherNonCreatureCount.value++
}

function decrement(type) {
  if (type === 'instant' && instantSorceryCount.value > 0) instantSorceryCount.value--
  else if (type === 'other' && otherNonCreatureCount.value > 0) otherNonCreatureCount.value--
}
</script>

<style scoped>
.spell-input {
  margin-bottom: 0.5rem;
}

.counter-row {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 0.5rem;
}

.counter {
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

.total {
  text-align: center;
  font-size: 0.8rem;
  color: #666;
}
</style>
