<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSaveStore } from '../stores/saveStore'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const saveStore = useSaveStore()
const mode = ref<'save' | 'load'>('save')

const sortedSaves = computed(() => saveStore.sortedSaves)

function saveGame(slotId: number) {
  const slotName = prompt('输入存档名称：', `存档 ${slotId}`)
  if (slotName !== null) {
    saveStore.saveToSlot(slotId, slotName || undefined)
  }
}

function loadGame(slotId: number) {
  if (confirm('确定要加载这个存档吗？当前进度将丢失。')) {
    saveStore.loadFromSlot(slotId)
    emit('close')
  }
}

function deleteSave(slotId: number, event: Event) {
  event.stopPropagation()
  if (confirm('确定要删除这个存档吗？')) {
    saveStore.deleteSlot(slotId)
  }
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function createNewSave() {
  const newId = saveStore.getAvailableSlotId()
  saveGame(newId)
}
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="emit('close')">
      <div class="modal-content save-modal">
        <div class="modal-header">
          <h2>💾 存档管理</h2>
          <button class="close-btn" @click="emit('close')">✕</button>
        </div>

        <div class="mode-tabs">
          <button 
            class="tab-btn" 
            :class="{ active: mode === 'save' }"
            @click="mode = 'save'"
          >
            保存
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: mode === 'load' }"
            @click="mode = 'load'"
          >
            读取
          </button>
        </div>

        <div class="auto-save-row">
          <span class="auto-save-label">自动存档</span>
          <label class="toggle-switch">
            <input 
              type="checkbox" 
              :checked="saveStore.autoSaveEnabled"
              @change="saveStore.toggleAutoSave($event.target.checked)"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="save-list">
          <div 
            v-for="save in sortedSaves" 
            :key="save.id"
            class="save-item"
            @click="mode === 'save' ? saveGame(save.id) : loadGame(save.id)"
          >
            <div class="save-icon">
              {{ mode === 'save' ? '💾' : '📂' }}
            </div>
            <div class="save-info">
              <span class="save-name">{{ save.name }}</span>
              <span class="save-details">{{ save.time }}</span>
            </div>
            <div class="save-meta">
              <span class="save-date">{{ formatDate(save.timestamp) }}</span>
              <button class="delete-btn" @click="deleteSave(save.id, $event)" title="删除">
                🗑️
              </button>
            </div>
          </div>

          <div v-if="sortedSaves.length === 0" class="empty-saves">
            暂无存档
          </div>

          <div v-if="mode === 'save'" class="new-save-btn" @click="createNewSave">
            <span class="plus-icon">+</span>
            <span>创建新存档</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.save-modal {
  padding: 24px;
  max-width: 500px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--accent-light);
}

.mode-tabs {
  display: flex;
  gap: 4px;
  background: var(--bg-tertiary);
  padding: 4px;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  background: transparent;
  color: var(--text-secondary);
}

.tab-btn.active {
  background: var(--bg-secondary);
  color: var(--text-primary);
  box-shadow: 0 2px 8px var(--shadow-color);
}

.auto-save-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  margin-bottom: 16px;
}

.auto-save-label {
  font-size: 14px;
  font-weight: 500;
}

.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: #cbd5e1;
  border-radius: 9999px;
  transition: 0.3s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--accent-primary);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.save-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
}

.save-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.save-item:hover {
  background: var(--accent-light);
  transform: translateX(4px);
}

.save-icon {
  font-size: 28px;
  width: 44px;
  text-align: center;
}

.save-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.save-name {
  font-weight: 600;
  font-size: 15px;
}

.save-details {
  font-size: 12px;
  color: var(--text-secondary);
}

.save-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.save-date {
  font-size: 11px;
  color: var(--text-muted);
}

.delete-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: #fee2e2;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-btn:hover {
  background: #fecaca;
}

.empty-saves {
  text-align: center;
  padding: 30px;
  color: var(--text-muted);
  font-size: 14px;
}

.new-save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  background: var(--accent-light);
  border: 2px dashed var(--accent-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--accent-primary);
  font-weight: 500;
  transition: all 0.2s;
}

.new-save-btn:hover {
  background: var(--accent-primary);
  color: white;
}

.plus-icon {
  font-size: 20px;
  font-weight: 700;
}
</style>
