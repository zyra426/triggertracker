<template>
  <div class="results">
    <section class="result-section tokens">
      <h3>Tokens to Create</h3>
      <div v-if="tokenResults.length === 0" class="empty-section">
        No tokens this turn
      </div>
      <div v-else class="token-list">
        <div v-for="(token, i) in tokenResults" :key="i" class="token-item">
          <span class="token-count">{{ token.finalCount }}x</span>
          <span class="token-type">{{ token.tokenType }}</span>
          <span v-if="token.multiplier > 1" class="token-multiplier">({{ token.multiplier }}x)</span>
        </div>
      </div>
      <div v-if="allyTokenFinalStats.power > 2" class="token-note">
        Ally tokens enter as {{ allyTokenFinalStats.power }}/{{ allyTokenFinalStats.toughness }}
      </div>
    </section>

    <section class="result-section prowess">
      <h3>Pre-Combat Prowess</h3>
      <div v-if="prowessResults.length === 0" class="empty-section">
        No creatures with prowess in play
      </div>
      <div v-else class="prowess-list">
        <div v-for="(p, i) in prowessResults" :key="i" class="prowess-item">
          <div class="prowess-row">
            <span class="creature-name">{{ p.creature }}</span>
            <span class="final-pt">{{ p.finalPower }}/{{ p.finalToughness }}</span>
          </div>
          <div class="prowess-breakdown">
            {{ p.basePower }}/{{ p.baseToughness }} base
            <span v-if="p.totalTriggers > 0"> +{{ p.totalTriggers }} prowess</span>
            <span v-if="p.magecraftBonus > 0" class="magecraft"> +{{ p.magecraftBonus }} magecraft</span>
          </div>
        </div>
      </div>
    </section>

    <div v-if="tokenMultiplier > 1" class="doubler-badge">
      {{ tokenMultiplier }}x Token Doubler{{ tokenDoublerCount > 1 ? 's' : '' }} Active
    </div>
    <div v-if="anthemBonus.power > 0 || anthemBonus.toughness > 0" class="doubler-badge">
      Anthem: +{{ anthemBonus.power }}/{{ anthemBonus.toughness }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  totalSpells: { type: Number, required: true },
  tokenResults: { type: Array, required: true },
  prowessResults: { type: Array, required: true },
  tokenMultiplier: { type: Number, required: true },
  tokenDoublerCount: { type: Number, required: true },
  hasTriggerDoubler: { type: Boolean, required: true },
  anthemBonus: { type: Object, required: true },
  allyTokenFinalStats: { type: Object, required: true }
})
</script>

<style scoped>
.results {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-section {
  background: #12121f;
  border: 1px solid #2a2a3e;
  border-radius: 12px;
  padding: 1rem;
}

.result-section h3 {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
  margin-bottom: 0.75rem;
}

.empty-section {
  color: #555;
  font-size: 0.85rem;
}

.token-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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
  min-width: 2.5rem;
}

.token-type {
  font-weight: 600;
}

.token-multiplier {
  color: #fbbf24;
  font-size: 0.8rem;
}

.token-note {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #fbbf24;
}

.prowess-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.prowess-item {
  padding: 0.5rem 0;
}

.prowess-item + .prowess-item {
  border-top: 1px solid #2a2a3e;
}

.prowess-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.15rem;
}

.creature-name {
  font-weight: 600;
  font-size: 0.95rem;
}

.final-pt {
  font-weight: 700;
  color: #60a5fa;
  font-size: 1.1rem;
}

.prowess-breakdown {
  font-size: 0.8rem;
  color: #888;
}

.magecraft {
  color: #c084fc;
}

.doubler-badge {
  text-align: center;
  padding: 0.4rem 0.75rem;
  background: #1a2e1a;
  border: 1px solid #2d4a2d;
  border-radius: 8px;
  font-size: 0.8rem;
  color: #4ade80;
}
</style>
