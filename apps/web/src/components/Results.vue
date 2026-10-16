<template>
  <div class="results">
    <section class="result-section tokens">
      <h3>{{ isCombatUpdate ? 'Tokens (incl. combat)' : 'Tokens to Create' }}</h3>
      <div v-if="phase.tokens.length === 0" class="empty-section">
        No tokens this turn
      </div>
      <div v-else class="token-list">
        <div v-for="token in phase.tokens" :key="token.sourceId + token.token.name" class="token-entry">
          <div class="token-item">
            <span class="token-count">{{ token.count }}x</span>
            <span class="token-type">{{ tokenLabel(token) }}</span>
            <span v-if="token.multiplier > 1" class="token-multiplier">({{ token.multiplier }}x)</span>
            <span class="token-source">{{ token.source }}</span>
          </div>
          <div v-if="token.stats" class="token-note">
            Enter as {{ token.stats.power }}/{{ token.stats.toughness }}
            <span v-if="token.stats.counters > 0"> (incl. {{ token.stats.counters }} +1/+1 counter{{ token.stats.counters > 1 ? 's' : '' }})</span>
            <span v-if="token.stats.keywords.length > 0"> · {{ token.stats.keywords.join(', ') }}</span>
            <div v-if="token.stats.maxProwessBonus > 0" class="token-prowess">
              Prowess: earliest tokens up to {{ token.stats.power + token.stats.maxProwessBonus }}/{{ token.stats.toughness + token.stats.maxProwessBonus }};
              each only counts spells cast after it entered
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="result-section prowess">
      <h3>{{ isCombatUpdate ? 'Creatures (incl. combat)' : 'Creatures' }}</h3>
      <div v-if="phase.creatures.length === 0" class="empty-section">
        No creatures in play
      </div>
      <div v-else class="prowess-list">
        <div v-for="c in phase.creatures" :key="c.cardId" class="prowess-item">
          <div class="prowess-row">
            <span class="creature-name">{{ c.name }}</span>
            <span class="final-pt">{{ c.finalPower }}/{{ c.finalToughness }}</span>
          </div>
          <div class="prowess-breakdown">
            {{ c.basePower }}/{{ c.baseToughness }} base
            <span v-if="c.prowessBonus > 0"> +{{ c.prowessBonus }} prowess<span v-if="c.prowessInstances > 1"> ({{ c.prowessInstances }} instances)</span></span>
            <span v-if="c.magecraftBonus > 0" class="magecraft"> +{{ c.magecraftBonus }} magecraft</span>
            <span v-if="c.anthemPower !== 0 || c.anthemToughness !== 0" class="anthem">{{ ` ${signed(c.anthemPower)}/${signed(c.anthemToughness)} anthem` }}</span>
            <span v-if="c.keywords.length > 0" class="keywords"> · {{ c.keywords.join(', ') }}</span>
          </div>
        </div>
      </div>
    </section>

    <template v-if="!isCombatUpdate">
      <div v-if="modifiers.tokenMultiplier > 1" class="doubler-badge">
        {{ modifiers.tokenMultiplier }}x Tokens ({{ modifiers.tokenDoublers.join(', ') }})
      </div>
      <div v-for="doubler in modifiers.triggerDoublers" :key="doubler.source" class="doubler-badge">
        {{ doubler.source }}: {{ doubler.triggers === 'any' ? 'spell' : 'I/S' }} triggers doubled
      </div>
      <div v-for="anthem in modifiers.anthems" :key="anthem.source + anthem.targets" class="doubler-badge">
        {{ anthem.source }}: {{ signed(anthem.power) }}/{{ signed(anthem.toughness) }} to {{ anthemTargets[anthem.targets] ?? anthem.targets }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Modifiers, PhaseResult } from "@triggertracker/domain"
import { signed, tokenLabel } from "../format.ts"

withDefaults(defineProps<{
  phase: PhaseResult
  modifiers: Modifiers
  isCombatUpdate?: boolean
}>(), { isCombatUpdate: false })

const anthemTargets: Record<string, string> = {
  all: "creatures",
  tokens: "tokens",
  allies: "Allies"
}

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

.token-entry + .token-entry {
  border-top: 1px solid #2a2a3e;
  padding-top: 0.5rem;
}

.token-source {
  margin-left: auto;
  font-size: 0.7rem;
  color: #666;
}

.token-note {
  margin-top: 0.15rem;
}

.token-prowess {
  color: #888;
  font-size: 0.75rem;
}

.anthem {
  color: #4ade80;
}

.keywords {
  color: #aaa;
}
</style>
