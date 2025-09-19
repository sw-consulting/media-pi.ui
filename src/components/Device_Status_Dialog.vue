// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi backend

<script setup>
import { computed, watch, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useDevicesStore } from '@/stores/devices.store.js'
import { useDeviceStatusesStore } from '@/stores/device.statuses.store.js'
import ServicesList from '@/components/Services_List.vue'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  deviceId: { type: Number, required: true }
})

const emit = defineEmits(['update:modelValue'])

const devicesStore = useDevicesStore()
const deviceStatusesStore = useDeviceStatusesStore()
const { statuses, loading } = storeToRefs(deviceStatusesStore)

// Manual refresh override: prioritizes explicit refresh over SSE
const manualStatus = ref(null)

const internalOpen = ref(props.modelValue)
watch(() => props.modelValue, (v) => { internalOpen.value = v })
watch(internalOpen, (v) => emit('update:modelValue', v))

// Compose live status for the device: prefer SSE item, fallback to device.deviceStatus
const status = computed(() => {
  const id = props.deviceId
  if (!id) return null
  // If user refreshed, prefer that value over SSE
  if (manualStatus.value && manualStatus.value.deviceId === id) {
    return manualStatus.value
  }
  const bySse = (statuses.value || []).find(s => s?.deviceId === id) || null
  if (bySse) return bySse
  const dev = devicesStore.getDeviceById(id)
  return dev?.deviceStatus || null
})

const device = computed(() => devicesStore.getDeviceById(props.deviceId))

const onlineClass = computed(() => status.value?.isOnline ? 'text-success' : 'text-danger')
const isAccessible = computed(() => Boolean(status.value?.isOnline))

function fmtDate(value) {
  if (!value) return '—'
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleString()
  } catch {
    return String(value)
  }
}

async function refreshNow () {
  try {
    const result = await deviceStatusesStore.getById(props.deviceId)
    // Ensure the dialog shows the freshly fetched value even if SSE also updates
    manualStatus.value = result || null
  } catch (err) {
    console.error('Ошибка обновления статуса устройства:', err)
  }
}

// Clear manual override when dialog closes or device changes
watch(internalOpen, (v) => {
  if (!v) manualStatus.value = null
})
watch(() => props.deviceId, () => {
  manualStatus.value = null
})

</script>

<template>
  <v-dialog v-model="internalOpen"  class="status-dialog">
    <v-card class="status-card">
      <v-card-title>
        <div class="d-flex align-center justify-space-between w-100">
          <div>
            <font-awesome-icon :icon="status?.isOnline ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'" :class="onlineClass" class="mr-2"/>
            <span>Статус устройства</span>
          </div>
        </div>
      </v-card-title>
      <v-card-text>
        <div class="status-grid">
          <div class="label">Название</div>
          <div class="value">{{ device?.name || '—' }}</div>

          <div class="label">IP адрес</div>
          <div class="value">{{ device?.ipAddress || '—' }}</div>

          <div class="label">Онлайн</div>
          <div class="value">
            <span :class="onlineClass">
              {{ status?.isOnline ? 'Да' : 'Нет' }}
            </span>
          </div>

          <div class="label">Последняя проверка</div>
          <div class="value">{{ fmtDate(status?.lastChecked) }}</div>

          <div class="label">Задержка подключения</div>
          <div class="value">{{ status?.connectLatencyMs ?? '—' }} мс</div>

          <div class="label">Задержка SSH</div>
          <div class="value">{{ status?.totalLatencyMs ?? '—' }} мс</div>
        </div>
        <ServicesList
          :device-id="props.deviceId"
          :accessible="isAccessible"
          :open="internalOpen"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <button 
          class="button-o-c primary"    
          type="button"
          :disabled="loading"
          @click="refreshNow">
            <font-awesome-icon size="1x" icon="fa-solid fa-rotate-right" class="mr-1" />
            Обновить
        </button>
        <button 
          class="button-o-c primary"    
          type="button"
          @click="internalOpen = false">
            <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
            Закрыть
        </button>
      </v-card-actions>
    </v-card>
  </v-dialog>
  
</template>

<style scoped>
.status-dialog {
  max-width: 900px;
}
.status-card {
  border: 2px solid var(--primary-color-dark);
  border-radius: 12px;
}
.status-grid {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 8px 16px;
  margin-bottom: 1.5rem;
}
.label {
  color: var(--button-secondary-bg);
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  display: block;
  width: auto;
}
.value { color: #1f2937; }
.text-success { color: #22c55e; }
.text-danger { color: #ef4444; }

.button-o-c {
  color: var(--button-secondary-bg);
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  margin: 0.5rem;
  transition: 0.4s;
  border: 1px solid var(--primary-color);
}

.button-o-c:hover, .button-o-c:focus {
  outline: none;
  box-shadow: 0px 2px 10px var(--primary-color);
  color: var(--primary-color);
}

</style>
