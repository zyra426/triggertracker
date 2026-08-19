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
        <button class="action-btn danger" @click="resetToDefaults">
          Reset
        </button>
      </div>

      <div v-if="showAddForm" class="add-form">
        <input v-model="newCard.name" placeholder="Card name" class="name-input" />

        <div class="effects-list">
          <div v-for="(effect, i) in newCard.effects" :key="i" class="effect-entry">
            <div class="effect-row">
              <select v-model="effect.type" class="effect-select">
                <option value="prowess">Prowess</option>
                <option value="tokenOnCast">Token on Cast</option>
                <option value="triggerDoubler">Trigger Doubler</option>
                <option value="tokenDoubler">Token Doubler</option>
                <option value="anthem">Anthem</option>
                <option value="magecraft">Magecraft</option>
              </select>
              <button class="remove-btn" @click="removeEffect(i)">&times;</button>
            </div>

            <div class="effect-params">
              <template v-if="effect.type === 'prowess'">
                <select v-model="effect.targets" class="param-select">
                  <option value="self">Self</option>
                  <option value="allies">Allies</option>
                  <option value="all">All</option>
                </select>
                <label v-if="effect.targets === 'allies'" class="checkbox-label">
                  <input type="checkbox" v-model="effect.excludeSelf" />
                  Exclude self
                </label>
              </template>

              <template v-if="effect.type === 'tokenOnCast'">
                <input v-model="effect.token" placeholder="Token type" class="param-input" />
                <select v-model="effect.trigger" class="param-select">
                  <option value="any">Any non-creature</option>
                  <option value="instantSorcery">I/S only</option>
                </select>
              </template>

              <template v-if="effect.type === 'triggerDoubler'">
                <select v-model="effect.triggers" class="param-select">
                  <option value="instantSorcery">Instants/Sorceries</option>
                  <option value="any">Any</option>
                </select>
              </template>

              <template v-if="effect.type === 'anthem'">
                <select v-model="effect.targets" class="param-select">
                  <option value="all">All creatures</option>
                  <option value="tokens">Tokens only</option>
                  <option value="allies">Allies only</option>
                </select>
                <input v-model.number="effect.power" type="number" placeholder="+P" class="param-num" />
                <input v-model.number="effect.toughness" type="number" placeholder="+T" class="param-num" />
              </template>

              <template v-if="effect.type === 'magecraft'">
                <input v-model.number="effect.bonus" type="number" placeholder="+N" class="param-num" />
              </template>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button class="action-btn" @click="addEffect">+ Effect</button>
          <button class="save-btn" @click="saveNewCard" :disabled="!newCard.name">Save</button>
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
        <div v-for="(card, i) in cards" :key="card.name" class="card-entry">
          <span class="card-name">{{ card.name }}</span>
          <button class="remove-btn" @click="removeCard(i)">&times;</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useCardDatabase } from '../composables/useCardDatabase.js'

const { cards, addCard, removeCard, resetToDefaults, exportCards, importCards } = useCardDatabase()

const isOpen = ref(false)
const showAddForm = ref(false)
const showImportExport = ref(false)
const importExportText = ref('')

const newCard = reactive({
  name: '',
  effects: []
})

function addEffect() {
  newCard.effects.push({ type: 'prowess', targets: 'self' })
}

function removeEffect(index) {
  newCard.effects.splice(index, 1)
}

function saveNewCard() {
  if (!newCard.name) return
  addCard({ ...newCard, effects: [...newCard.effects] })
  newCard.name = ''
  newCard.effects = []
  showAddForm.value = false
}

function doExport() {
  importExportText.value = exportCards()
}

function doImport() {
  if (importCards(importExportText.value)) {
    showImportExport.value = false
    importExportText.value = ''
  } else {
    alert('Invalid JSON')
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
</style>
