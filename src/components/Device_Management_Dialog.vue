// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application
<script setup>

import { computed, onBeforeUnmount, ref, watch } from 'vue'
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

const informationalPanels = [
  { key: 'timers', title: 'Настройки таймеров' },
  { key: 'playlist', title: 'Настройки плей-листа' }
]

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
  shutdown: false,
  audioUpdate: false,
  audioSave: false
})

const systemOperationTimers = ref({
  apply: null,
  reboot: null,
  shutdown: null
})

// Audio settings state
const audioSettings = ref({
  output: 'hdmi' // default to hdmi
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
    await initializeDevice()
  }
}, { immediate: true })

// If deviceId changes while dialog is open, refresh status
watch(() => props.deviceId, async (id) => {
  if (internalOpen.value && id) {
    await initializeDevice()
  }
})

// Clear manual override when dialog closes or device changes
watch(internalOpen, (v) => {
  if (!v) {
    manualStatus.value = null
    resetSystemOperations()
  }
})
watch(() => props.deviceId, () => {
  manualStatus.value = null
  resetSystemOperations()
})

// Watch for device coming online to load audio settings
watch(() => currentStatus.value?.isOnline, async (isOnline, wasOnline) => {
  // Only load audio settings when device comes online (was offline, now online)
  if (isOnline && wasOnline === false && internalOpen.value && props.deviceId) {
    await updateAudioSettings()
  }
})

async function initializeDevice() {
  if (!props.deviceId) return

  await fetchDeviceStatus()

  // Only load audio settings if device is online, otherwise set default
  const status = currentStatus.value
  if (status?.isOnline) {
    await updateAudioSettings()
  } else {
    // Set default audio value silently when device is offline
    audioSettings.value.output = 'hdmi'
  }
}

const onlineClass = computed(() => currentStatus.value?.isOnline ? 'text-success' : 'text-danger')

const isDisabled = computed(() => !currentStatus.value?.isOnline)
const hasAnyOperationInProgress = computed(() =>
  operationInProgress.value.apply || operationInProgress.value.reboot || operationInProgress.value.shutdown ||
  operationInProgress.value.audioUpdate || operationInProgress.value.audioSave
)

const resetSystemOperations = () => {
  Object.keys(systemOperationTimers.value).forEach((key) => {
    if (systemOperationTimers.value[key]) {
      clearTimeout(systemOperationTimers.value[key])
      systemOperationTimers.value[key] = null
    }
  })
  Object.keys(operationInProgress.value).forEach((key) => {
    operationInProgress.value[key] = false
  })
}

// Audio methods
async function updateAudioSettings() {
  operationInProgress.value.audioUpdate = true
  try {
    const result = await devicesStore.getAudio(props.deviceId)
    if (result?.output === 'unknown' || !['hdmi', 'jack'].includes(result?.output)) {
      alertStore.error('Неизвестный тип аудио выхода. Установлено значение по умолчанию: HDMI')
      audioSettings.value.output = 'hdmi'
    } else {
      audioSettings.value.output = result.output
    }
  } catch (err) {
    alertStore.error('Не удалось загрузить настройки аудио: ' + (err?.message || 'Неизвестная ошибка'))
  } finally {
    operationInProgress.value.audioUpdate = false
  }
}

async function saveAudioSettings() {
  operationInProgress.value.audioSave = true
  try {
    await devicesStore.updateAudio(props.deviceId, { output: audioSettings.value.output })
    alertStore.success('Настройки аудио успешно сохранены')
  } catch (err) {
    alertStore.error('Не удалось сохранить настройки аудио: ' + (err?.message || 'Неизвестная ошибка'))
  } finally {
    operationInProgress.value.audioSave = false
  }
}

const runWithDevice = async (handler) => {
  if (!props.deviceId || typeof handler !== 'function') return false
  try {
    await handler(props.deviceId)
    return true
  } catch (err) {
    const message = err?.message || 'Ошибка выполнения операции'
    alertStore.error(message)
    return false
  }
}

const runSystemOperation = async (key, handler, timeout) => {
  if (!['apply', 'reboot', 'shutdown'].includes(key)) return
  resetSystemOperationTimer(key)
  operationInProgress.value[key] = true
  const success = await runWithDevice(handler)
  if (!success) {
    operationInProgress.value[key] = false
    return
  }

  const deviceIdAtStart = props.deviceId
  systemOperationTimers.value[key] = setTimeout(async () => {
    if (!internalOpen.value || props.deviceId !== deviceIdAtStart) {
      operationInProgress.value[key] = false
      return
    }
    await fetchDeviceStatus()
    operationInProgress.value[key] = false
    systemOperationTimers.value[key] = null
  }, timeout)
}

const resetSystemOperationTimer = (key) => {
  if (systemOperationTimers.value[key]) {
    clearTimeout(systemOperationTimers.value[key])
    systemOperationTimers.value[key] = null
  }
}

const apply = async () => {
  await runSystemOperation('apply', devicesStore.reloadSystem, timeouts.apply)
}

const reboot = async () => {
  await runSystemOperation('reboot', devicesStore.rebootSystem, timeouts.reboot)
}

const shutdown = async () => {
  await runSystemOperation('shutdown', devicesStore.shutdownSystem, timeouts.shutdown)
}

onBeforeUnmount(() => {
  resetSystemOperations()
})
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
            <legend class="primary-heading">Настройки аудио</legend>
            <div class="panel-content audio-settings">
              <label for="audio-output" class="audio-label">Аудиовыход</label>
              <select
                id="audio-output"
                v-model="audioSettings.output"
                class="audio-selector"
                :disabled="isDisabled || hasAnyOperationInProgress"
              >
                <option value="hdmi">HDMI audio</option>
                <option value="jack">3.5'' jack audio</option>
              </select>
              <button
                class="button-o-c"
                type="button"
                :disabled="isDisabled || hasAnyOperationInProgress"
                @click="updateAudioSettings"
              >
                <font-awesome-icon
                  size="1x"
                  :icon="operationInProgress.audioUpdate ? 'fa-solid fa-spinner' : 'fa-solid fa-rotate-right'"
                  :class="{ 'fa-spin': operationInProgress.audioUpdate }"
                  class="mr-1"
                />
                {{ operationInProgress.audioUpdate ? 'Читается...' : 'Прочитать' }}
              </button>
              <button
                class="button-o-c"
                type="button"
                :disabled="isDisabled || hasAnyOperationInProgress"
                @click="saveAudioSettings"
              >
                <font-awesome-icon
                  size="1x"
                  :icon="operationInProgress.audioSave ? 'fa-solid fa-spinner' : 'fa-regular fa-save'"
                  :class="{ 'fa-spin': operationInProgress.audioSave }"
                  class="mr-1"
                />
                {{ operationInProgress.audioSave ? 'Сохраняется...' : 'Сохранить' }}
              </button>
            </div>
          </fieldset>

          <fieldset class="panel">
            <legend class="primary-heading">Управление системой</legend>
            <div class="panel-content system-actions">
              <button
                class="button-o-c"
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
                class="button-o-c"
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
                class="button-o-c"
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

.audio-settings {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  align-items: center;
}

.audio-label {
  font-size: 1rem;
  color: var(--text-color);
  margin-right: 0.5rem;
  line-height: 36px;
  vertical-align: middle;
}

.audio-selector {
  padding: 0 0.75rem;
  height: 36px;
  line-height: 36px;
  box-sizing: border-box;
  border: 1px solid var(--primary-color);
  border-radius: 4px;
  background-color: var(--background-color);
  color: var(--text-color);
  min-width: 140px;
  display: inline-block;
  vertical-align: middle;

  /* keep a subtle chevron only */
  padding-right: 2.25rem; /* room for chevron */
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
  background-repeat: no-repeat;
  background-position: right 0.6rem center;
  background-size: 12px;
}

.audio-selector:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
