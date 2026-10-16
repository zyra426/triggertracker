<template>
  <div class="card-editor">
    <div class="section-header" @click="isOpen = !isOpen">
      <span class="section-title">Card Editor</span>
      <svg class="chevron" :class="{ open: isOpen }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </div>

    <div v-if="isOpen" class="editor-body">
      <div class="editor-actions">
        <button class="action-btn" @click="showAddForm = !showAddForm">
          {{ showAddForm ? 'Cancel' : '+ Add Card' }}
        </button>
        <button class="action-btn" @click="showImportExport = !showImportExport">
          Import / Export
        </button>
        <button class="action-btn danger" @click="run(resetToDefaults)">
          Reset
        </button>
      </div>

      <div v-if="error" class="error">{{ error }}</div>

      <div v-if="showAddForm" class="add-form">
        <input v-model="draft.name" placeholder="Card name" class="name-input" />
        <div class="card-fields">
          <input v-model="draft.types" placeholder="Types (e.g. Legendary, Creature)" class="param-input wide" />
          <input v-model="draft.subtypes" placeholder="Subtypes (e.g. Human, Ally)" class="param-input wide" />
          <label class="checkbox-label">
            P/T
            <input v-model="draft.power" type="number" placeholder="P" class="param-num" />
            <input v-model="draft.toughness" type="number" placeholder="T" class="param-num" />
          </label>
        </div>

        <div class="effects-list">
          <div v-for="(effect, i) in draft.effects" :key="i" class="effect-entry">
            <div class="effect-row">
              <select v-model="effect.type" class="effect-select">
                <option v-for="option in effectTypes" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
              <button class="remove-btn" @click="draft.effects.splice(i, 1)">&times;</button>
            </div>
            <div class="effect-params">
              <template v-if="effect.type === 'prowess'">
                <select v-model="effect.prowessTargets" class="param-select">
                  <option value="self">Self</option>
                  <option value="allies">Allies</option>
                  <option value="all">All</option>
                </select>
                <label v-if="effect.prowessTargets === 'allies'" class="checkbox-label">
                  <input type="checkbox" v-model="effect.excludeSelf" />
                  Exclude self
                </label>
              </template>
              <template v-if="effect.type === 'tokenOnCast'">
                <input v-model="effect.tokenName" placeholder="Token name" class="param-input" />
                <select v-model="effect.trigger" class="param-select">
                  <option value="any">Any non-creature</option>
                  <option value="instantSorcery">I/S only</option>
                </select>
                <label class="checkbox-label">
                  <input type="checkbox" v-model="effect.tokenIsCreature" />
                  Creature
                </label>
                <template v-if="effect.tokenIsCreature">
                  <input v-model="effect.tokenPower" type="number" placeholder="P" class="param-num" />
                  <input v-model="effect.tokenToughness" type="number" placeholder="T" class="param-num" />
                  <input v-model="effect.tokenSubtypes" placeholder="Subtypes (e.g. Ally)" class="param-input" />
                  <input v-model="effect.keywords" placeholder="Keywords (e.g. flying)" class="param-input" />
                </template>
              </template>
              <template v-if="effect.type === 'triggerDoubler'">
                <select v-model="effect.triggers" class="param-select">
                  <option value="instantSorcery">Instants/Sorceries</option>
                  <option value="any">Any</option>
                </select>
              </template>
              <template v-if="effect.type === 'anthem'">
                <select v-model="effect.anthemTargets" class="param-select">
                  <option value="all">All creatures</option>
                  <option value="tokens">Tokens only</option>
                  <option value="allies">Allies only</option>
                </select>
                <input v-model="effect.power" type="number" placeholder="+P" class="param-num" />
                <input v-model="effect.toughness" type="number" placeholder="+T" class="param-num" />
                <input v-model="effect.keywords" placeholder="Keywords" class="param-input" />
              </template>
              <template v-if="effect.type === 'magecraft'">
                <input v-model="effect.bonus" type="number" placeholder="+N" class="param-num" />
              </template>
              <template v-if="effect.type === 'allyEnters'">
                <label class="checkbox-label">
                  +1/+1 counters
                  <input v-model="effect.counterAmount" type="number" class="param-num" />
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" v-model="effect.gainsHaste" />
                  Gains haste
                </label>
              </template>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button class="action-btn" @click="draft.effects.push(newEffect())">+ Effect</button>
          <button class="save-btn" @click="saveNewCard" :disabled="!draft.name.trim() || saving">Save</button>
        </div>
      </div>

      <div v-if="showImportExport" class="import-export">
        <textarea v-model="importExportText" rows="6" placeholder="Paste JSON here..."></textarea>
        <div class="ie-actions">
          <button class="action-btn" @click="doImport">Import</button>
          <button class="action-btn" @click="doExport">Export</button>
        </div>
      </div>

      <div class="card-list">
        <div v-for="card in cards" :key="card.id" class="card-entry">
          <span class="card-name">{{ card.name }}</span>
          <span class="card-meta">{{ describe(card) }}</span>
          <button class="remove-btn" @click="run(() => removeCard(card.id))">&times;</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Schema } from "effect"
import { reactive, ref } from "vue"
import type { Card, CardEffect, CardEffectType } from "@triggertracker/domain"
import { CardInput } from "@triggertracker/domain"
import { errorMessage } from "../api/client.ts"
import { useCards } from "../composables/useCards.ts"

const decodeCardInput = Schema.decodeUnknownSync(CardInput)

const { cards, addCard, removeCard, resetToDefaults, exportCards, importCards } = useCards()

const effectTypes: ReadonlyArray<{ value: CardEffectType; label: string }> = [
  { value: "prowess", label: "Prowess" },
  { value: "tokenOnCast", label: "Token on Cast" },
  { value: "triggerDoubler", label: "Trigger Doubler" },
  { value: "tokenDoubler", label: "Token Doubler" },
  { value: "anthem", label: "Anthem" },
  { value: "magecraft", label: "Magecraft" },
  { value: "allyEnters", label: "Ally Enters (counters)" }
]

// Form state: every field any effect type might need. Number inputs may hold
// "" when cleared, so they are typed loosely and converted on save.
type NumberInput = number | string

interface EffectDraft {
  type: CardEffectType
  prowessTargets: "self" | "allies" | "all"
  excludeSelf: boolean
  trigger: "any" | "instantSorcery"
  triggers: "any" | "instantSorcery"
  tokenName: string
  tokenIsCreature: boolean
  tokenPower: NumberInput
  tokenToughness: NumberInput
  tokenSubtypes: string
  anthemTargets: "all" | "tokens" | "allies"
  power: NumberInput
  toughness: NumberInput
  keywords: string
  bonus: NumberInput
  counterAmount: NumberInput
  gainsHaste: boolean
}

const newEffect = (): EffectDraft => ({
  type: "prowess",
  prowessTargets: "self",
  excludeSelf: false,
  trigger: "any",
  triggers: "instantSorcery",
  tokenName: "",
  tokenIsCreature: true,
  tokenPower: 1,
  tokenToughness: 1,
  tokenSubtypes: "",
  anthemTargets: "all",
  power: 1,
  toughness: 1,
  keywords: "",
  bonus: 1,
  counterAmount: 1,
  gainsHaste: false
})

const newDraft = () => ({
  name: "",
  types: "Creature",
  subtypes: "",
  power: "" as NumberInput,
  toughness: "" as NumberInput,
  effects: [] as Array<EffectDraft>
})

const isOpen = ref(false)
const showAddForm = ref(false)
const showImportExport = ref(false)
const importExportText = ref("")
const error = ref<string | null>(null)
const saving = ref(false)
const draft = reactive(newDraft())

const list = (value: string): Array<string> =>
  value.split(",").map((part) => part.trim()).filter((part) => part.length > 0)

const optionalNumber = (value: NumberInput): number | undefined =>
  value === "" ? undefined : Number(value)

const toEffect = (effect: EffectDraft): CardEffect => {
  switch (effect.type) {
    case "prowess":
      return effect.prowessTargets === "allies"
        ? { type: "prowess", targets: "allies", excludeSelf: effect.excludeSelf }
        : { type: "prowess", targets: effect.prowessTargets }
    case "tokenOnCast":
      return {
        type: "tokenOnCast",
        trigger: effect.trigger,
        token: effect.tokenIsCreature
          ? {
            name: effect.tokenName.trim(),
            types: ["Creature"],
            subtypes: list(effect.tokenSubtypes),
            power: Number(effect.tokenPower),
            toughness: Number(effect.tokenToughness),
            keywords: list(effect.keywords)
          }
          : { name: effect.tokenName.trim(), types: ["Artifact"], subtypes: [effect.tokenName.trim()] }
      }
    case "triggerDoubler":
      return { type: "triggerDoubler", triggers: effect.triggers }
    case "tokenDoubler":
      return { type: "tokenDoubler" }
    case "anthem":
      return {
        type: "anthem",
        targets: effect.anthemTargets,
        power: Number(effect.power),
        toughness: Number(effect.toughness),
        keywords: list(effect.keywords)
      }
    case "magecraft":
      return { type: "magecraft", bonus: Number(effect.bonus) }
    case "allyEnters":
      return { type: "allyEnters", counterAmount: Number(effect.counterAmount), gainsHaste: effect.gainsHaste }
  }
}

const describe = (card: Card): string => {
  const types = [...card.types, ...(card.subtypes.length > 0 ? ["—", ...card.subtypes] : [])].join(" ")
  const pt = card.power !== undefined && card.toughness !== undefined ? ` ${card.power}/${card.toughness}` : ""
  return types + pt
}

async function run(action: () => Promise<unknown>) {
  try {
    await action()
    error.value = null
    return true
  } catch (e) {
    error.value = errorMessage(e)
    return false
  }
}

async function saveNewCard() {
  const power = optionalNumber(draft.power)
  const toughness = optionalNumber(draft.toughness)
  const candidate = {
    name: draft.name.trim(),
    types: list(draft.types),
    subtypes: list(draft.subtypes),
    effects: draft.effects.map(toEffect),
    ...(power !== undefined ? { power } : {}),
    ...(toughness !== undefined ? { toughness } : {})
  }
  // Validate with the same schema the API uses, so errors show up instantly.
  let input: CardInput
  try {
    input = decodeCardInput(candidate)
  } catch (e) {
    error.value = `Invalid card: ${errorMessage(e)}`
    return
  }
  saving.value = true
  const ok = await run(() => addCard(input))
  saving.value = false
  if (ok) {
    Object.assign(draft, newDraft())
    showAddForm.value = false
  }
}

async function doExport() {
  await run(async () => {
    importExportText.value = await exportCards()
  })
}

async function doImport() {
  const ok = await run(() => importCards(importExportText.value))
  if (ok) {
    showImportExport.value = false
    importExportText.value = ""
  }
}
</script>

<style scoped>
.card-editor {
  margin-top: 1rem;
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

.editor-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.editor-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.action-btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid #333;
  border-radius: 6px;
  background: #1a1a2e;
  color: #ccc;
  cursor: pointer;
  font-size: 0.8rem;
}

.action-btn:active {
  background: #2a2a3e;
}

.action-btn.danger {
  color: #ef4444;
}

.add-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.name-input {
  padding: 0.6rem;
  border: 1px solid #333;
  border-radius: 6px;
  background: #12121f;
  color: white;
  font-size: 0.9rem;
}

.effects-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.effect-entry {
  border: 1px solid #2a2a3e;
  border-radius: 6px;
  padding: 0.5rem;
}

.effect-row {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.effect-select {
  flex: 1;
  padding: 0.4rem;
  border: 1px solid #333;
  border-radius: 4px;
  background: #1a1a2e;
  color: white;
  font-size: 0.8rem;
}

.effect-params {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.param-select,
.param-input {
  padding: 0.4rem;
  border: 1px solid #333;
  border-radius: 4px;
  background: #1a1a2e;
  color: white;
  font-size: 0.8rem;
}

.param-num {
  width: 50px;
  padding: 0.4rem;
  border: 1px solid #333;
  border-radius: 4px;
  background: #1a1a2e;
  color: white;
  font-size: 0.8rem;
  text-align: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  color: #aaa;
}

.remove-btn {
  width: 28px;
  height: 28px;
  border: 1px solid #333;
  border-radius: 4px;
  background: transparent;
  color: #ef4444;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-btn:active {
  background: #2a1a1a;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
}

.save-btn {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #4ade80;
  border-radius: 6px;
  background: transparent;
  color: #4ade80;
  cursor: pointer;
  font-weight: 600;
}

.save-btn:active:not(:disabled) {
  background: #1a2e1a;
}

.save-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.import-export textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #333;
  border-radius: 6px;
  background: #12121f;
  color: white;
  font-family: monospace;
  font-size: 0.75rem;
  resize: vertical;
  margin-bottom: 0.5rem;
}

.ie-actions {
  display: flex;
  gap: 0.5rem;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.card-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.6rem;
  border: 1px solid #2a2a3e;
  border-radius: 6px;
}

.card-name {
  font-size: 0.85rem;
}

.card-fields {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.param-input.wide {
  flex: 1 1 12rem;
}

.card-entry .card-name {
  flex: 1;
}

.card-meta {
  font-size: 0.7rem;
  color: #666;
  margin: 0 0.5rem;
  text-align: right;
}

.error {
  padding: 0.5rem 0.75rem;
  border: 1px solid #7f1d1d;
  border-radius: 8px;
  background: #2a1215;
  color: #fca5a5;
  font-size: 0.8rem;
  white-space: pre-wrap;
}
</style>
