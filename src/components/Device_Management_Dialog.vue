<script setup>
// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { useDevicesStore } from '@/stores/devices.store.js'
import { useDeviceStatusesStore } from '@/stores/device.statuses.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { timeouts } from '@/helpers/config.js'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  deviceId: { type: Number, required: true }
})

const emit = defineEmits(['update:modelValue'])

const devicesStore = useDevicesStore()
const deviceStatusesStore = useDeviceStatusesStore()
const alertStore = useAlertStore()
const alertRefs = storeToRefs(alertStore) || {}
const alert = alertRefs.alert

const clearAlert = () => {
  if (alertStore && typeof alertStore.clear === 'function') alertStore.clear()
}
const { statuses } = storeToRefs(deviceStatusesStore)

// Manual refresh override: prioritizes explicit refresh over SSE
const manualStatus = ref(null)

// Track ongoing operations to disable controls
const operationInProgress = ref({
  apply: false,
  reboot: false,
  shutdown: false
})

watch(
  () => statuses.value,
  (newStatuses) => {
    if (!manualStatus.value) return
    const id = props.deviceId
    if (!id) {
      manualStatus.value = null
      return
    }
    const live = (newStatuses || []).find((status) => status?.deviceId === id)
    if (live) {
      manualStatus.value = null
    }
  },
  { deep: true }
)

const internalOpen = ref(props.modelValue)
watch(() => props.modelValue, (value) => { internalOpen.value = value })
watch(internalOpen, (value) => emit('update:modelValue', value))

async function fetchDeviceStatus() {
  if (!props.deviceId) return
  try {
    const result = await deviceStatusesStore.getById(props.deviceId)
    // Ensure the dialog shows the freshly fetched value even if SSE also updates
    manualStatus.value = result || null
  } catch (err) {
    alertStore.error('Не удалось обновить статус устройства: ' + (err?.message || 'Неизвестная ошибка'))
  }
}

// Initialize device status when dialog opens
watch(internalOpen, async (isOpen) => {
  if (isOpen && props.deviceId) {
    await fetchDeviceStatus()
  }
}, { immediate: true })

// If deviceId changes while dialog is open, refresh status
watch(() => props.deviceId, async (id) => {
  if (internalOpen.value && id) {
    await fetchDeviceStatus()
  }
})

// Clear manual override when dialog closes or device changes
watch(internalOpen, (v) => {
  if (!v) manualStatus.value = null
})
watch(() => props.deviceId, () => {
  manualStatus.value = null
})

const informationalPanels = [
  { key: 'timers', title: 'Настройки таймеров' },
  { key: 'playlist', title: 'Настройки плей-листа' },
  { key: 'audio', title: 'Настройки аудио' }
]

const currentStatus = computed(() => {
  const id = props.deviceId
  if (!id) return null

  // If user refreshed, prefer that value over SSE
  if (manualStatus.value && manualStatus.value.deviceId === id) {
    return manualStatus.value
  }
  
  const live = (statuses.value || []).find((s) => s?.deviceId === id)
  if (live) return live

  const device = devicesStore.getDeviceById(id)
  return device?.deviceStatus || null
})

const onlineClass = computed(() => currentStatus.value?.isOnline ? 'text-success' : 'text-danger')

const isDisabled = computed(() => !currentStatus.value?.isOnline)
const hasAnyOperationInProgress = computed(() => 
  operationInProgress.value.apply || operationInProgress.value.reboot || operationInProgress.value.shutdown
)

const runWithDevice = async (handler) => {
  if (!props.deviceId || typeof handler !== 'function') return
  try {
    await handler(props.deviceId)
  } catch (err) {
    const message = err?.message || 'Ошибка выполнения операции'
    alertStore.error(message)
  }
}

const apply = async () => {
  operationInProgress.value.apply = true
  try {
    await runWithDevice(devicesStore.reloadSystem)
    setTimeout(async () => {
      await fetchDeviceStatus()
      operationInProgress.value.apply = false
    }, timeouts.apply)
  } catch (err) {
    operationInProgress.value.apply = false
    // Error is already handled by runWithDevice
  }
}

const reboot = async () => {
  operationInProgress.value.reboot = true
  try {
    await runWithDevice(devicesStore.rebootSystem)
    setTimeout(async () => {
      await fetchDeviceStatus()
      operationInProgress.value.reboot = false
    }, timeouts.reboot)
  } catch (err) {
    operationInProgress.value.reboot = false
    // Error is already handled by runWithDevice
  }
}

const shutdown = async () => {
  operationInProgress.value.shutdown = true
  try {
    await runWithDevice(devicesStore.shutdownSystem)
    setTimeout(async () => {
      await fetchDeviceStatus()
      operationInProgress.value.shutdown = false
    }, timeouts.shutdown)
  } catch (err) {
    operationInProgress.value.shutdown = false
    // Error is already handled by runWithDevice
  }
}
</script>

<template>
  <v-dialog v-model="internalOpen" class="management-dialog">
    <v-card class="management-card">
      <v-card-title>
        <div class="primary-heading">
          <font-awesome-icon :icon="currentStatus?.isOnline ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'" :class="onlineClass" class="mr-2"/>
          <span>Управление устройством</span>
        </div>
      </v-card-title>
      <v-card-text>
        <div class="panel-grid">
          <fieldset v-for="panel in informationalPanels" :key="panel.key" class="panel">
            <legend class="primary-heading">{{ panel.title }}</legend>
            <div class="panel-content" />
          </fieldset>

          <fieldset class="panel">
            <legend class="primary-heading">Управление системой</legend>
            <div class="panel-content system-actions">
              <button
                class="button-o-c primary"
                type="button"
                :disabled="isDisabled || hasAnyOperationInProgress"
                @click="apply"
              >
                <font-awesome-icon 
                  size="1x" 
                  :icon="operationInProgress.apply ? 'fa-solid fa-spinner' : 'fa-solid fa-download'" 
                  :class="{ 'fa-spin': operationInProgress.apply }"
                  class="mr-1" 
                />
                {{ operationInProgress.apply ? 'Применяется...' : 'Применить' }}
              </button>
              <button
                class="button-o-c warning"
                type="button"
                :disabled="isDisabled || hasAnyOperationInProgress"
                @click="reboot"
              >
                <font-awesome-icon 
                  size="1x" 
                  :icon="operationInProgress.reboot ? 'fa-solid fa-spinner' : 'fa-solid fa-retweet'" 
                  :class="{ 'fa-spin': operationInProgress.reboot }"
                  class="mr-1" 
                />
                {{ operationInProgress.reboot ? 'Перезагружается...' : 'Перезагрузить' }}
              </button>
              <button
                class="button-o-c danger"
                type="button"
                :disabled="isDisabled || hasAnyOperationInProgress"
                @click="shutdown"
              >
                <font-awesome-icon 
                  size="1x" 
                  :icon="operationInProgress.shutdown ? 'fa-solid fa-spinner' : 'fa-solid fa-power-off'" 
                  :class="{ 'fa-spin': operationInProgress.shutdown }"
                  class="mr-1" 
                />
                {{ operationInProgress.shutdown ? 'Выключается...' : 'Выключить' }}
              </button>
            </div>
          </fieldset>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <button 
          class="button-o-c primary"    
          type="button"
          @click="internalOpen = false">
            <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
            Закрыть
        </button>
      </v-card-actions>
      <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
        <button @click="clearAlert()" class="btn btn-link close">×</button>
        {{ alert.message }}
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.management-dialog {
  max-width: 900px;
}

.management-card {
  border: 2px solid var(--primary-color-dark);
  border-radius: 12px;
}

.panel-grid {
  display: grid;
  gap: 1rem;
}

.panel {
  border: 2px solid var(--primary-color-dark);
  border-radius: 12px;
  padding: 1rem;
}

.panel legend {
  padding: 0 0.5rem;
  font-size: 1.1rem;
}

.panel-content {
  min-height: 40px;
}

.system-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  align-items: center;
}

.button-o-c {
  color: var(--button-secondary-bg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0 0.75rem;
  margin: 0.5rem;
  transition: 0.4s;
  border: 1px solid var(--primary-color);
  cursor: pointer;
}

.button-o-c:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.button-o-c:hover:not(:disabled), .button-o-c:focus:not(:disabled) {
  outline: none;
  box-shadow: 0px 2px 10px var(--primary-color);
  color: var(--primary-color);
}

.fa-spin {
  animation: fa-spin 2s infinite linear;
}

@keyframes fa-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
