// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application
<script setup>

import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'

import { useDevicesStore } from '@/stores/devices.store.js'
import { useDeviceStatusesStore } from '@/stores/device.statuses.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { timeouts } from '@/helpers/config.js'
import FieldArrayWithButtons from '@/components/FieldArrayWithButtons.vue'

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
  shutdown: false,
  audioUpdate: false,
  audioSave: false,
  playlistUpdate: false,
  playlistSave: false,
  scheduleUpdate: false,
  scheduleSave: false
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

// Playlist settings state
const playlistSettings = ref({
  source: '',
  destination: ''
})

const defaultTimeValue = '00:00'
const createDefaultRestPair = () => ({ start: defaultTimeValue, stop: defaultTimeValue })
const createDefaultScheduleValues = () => ({
  playlist: [defaultTimeValue],
  video: [defaultTimeValue],
  rest: [createDefaultRestPair()]
})

const scheduleFormValues = ref(createDefaultScheduleValues())
const scheduleFormRef = ref(null)
const timeFieldProps = Object.freeze({
  type: 'time',
  step: 60
})
const restDefaultValue = Object.freeze(createDefaultRestPair())
const timeValueSchema = Yup.string()
  .required('Укажите время в формате HH:mm')
  .matches(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Некорректный формат времени HH:mm')
const scheduleValidationSchema = Yup.object({
  playlist: Yup.array().of(timeValueSchema).min(1, 'Добавьте время загрузки плей-листа'),
  video: Yup.array().of(timeValueSchema).min(1, 'Добавьте время воспроизведения видео'),
  rest: Yup.array()
    .of(
      Yup.object({
        start: timeValueSchema,
        stop: timeValueSchema
      })
    )
    .min(1, 'Добавьте период отдыха')
})

const hasErrorsForPrefix = (errors = {}, prefix) => {
  if (!prefix) return false
  return Object.keys(errors).some((key) => key.startsWith(prefix))
}

const sanitizeFieldName = (value) => {
  if (!value) return ''
  return value
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

const normalizeTimeList = (list) => {
  if (Array.isArray(list) && list.length) {
    const sanitized = list
      .map((item) => (typeof item === 'string' && item.trim() ? item.trim() : null))
      .filter(Boolean)
    if (sanitized.length) return sanitized
  }
  return [defaultTimeValue]
}

const normalizeRestList = (list) => {
  if (Array.isArray(list) && list.length) {
    const sanitized = list
      .map((item) => ({
        start: typeof item?.start === 'string' && item.start.trim() ? item.start.trim() : defaultTimeValue,
        stop: typeof item?.stop === 'string' && item.stop.trim() ? item.stop.trim() : defaultTimeValue
      }))
    if (sanitized.length) return sanitized
  }
  return [createDefaultRestPair()]
}

const applyScheduleValues = (values) => {
  const normalized = {
    playlist: normalizeTimeList(values?.playlist),
    video: normalizeTimeList(values?.video),
    rest: normalizeRestList(values?.rest)
  }
  scheduleFormValues.value = normalized
  if (scheduleFormRef.value) {
    scheduleFormRef.value.resetForm({ values: normalized })
  }
}

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

const device = computed(() => devicesStore.getDeviceById(props.deviceId))

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
    // Clear global alerts when the dialog is closed to avoid overlapping UI
    try {
      clearAlert()
    } catch {
      // swallow errors silently
    }
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
    await updatePlaylistSettings()
    await updateScheduleSettings()
  }
})

async function initializeDevice() {
  if (!props.deviceId) return

  await fetchDeviceStatus()

  // Only load audio settings if device is online, otherwise set default
  const status = currentStatus.value
  if (status?.isOnline) {
    await updateAudioSettings()
    await updatePlaylistSettings()
    await updateScheduleSettings()
  } else {
    // Set default audio value silently when device is offline
    audioSettings.value.output = 'hdmi'
    playlistSettings.value.source = ''
    playlistSettings.value.destination = ''
    applyScheduleValues(createDefaultScheduleValues())
  }
}

const onlineClass = computed(() => currentStatus.value?.isOnline ? 'text-success' : 'text-danger')

// Note: playlist status column removed — UI simplified to source/destination only

const isDisabled = computed(() => !currentStatus.value?.isOnline)
const hasAnyOperationInProgress = computed(() =>
  Object.values(operationInProgress.value).some(Boolean)
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
    alertStore.success('Настройки аудио сохранены')
  } catch (err) {
    alertStore.error('Не удалось сохранить настройки аудио: ' + (err?.message || 'Неизвестная ошибка'))
  } finally {
    operationInProgress.value.audioSave = false
  }
}

// Playlist methods
async function updatePlaylistSettings() {
  operationInProgress.value.playlistUpdate = true
  try {
    const result = await devicesStore.getPlaylist(props.deviceId)
    playlistSettings.value.source = result?.source || ''
    playlistSettings.value.destination = result?.destination || ''
  } catch (err) {
    alertStore.error('Не удалось загрузить настройки плей-листа: ' + (err?.message || 'Неизвестная ошибка'))
  } finally {
    operationInProgress.value.playlistUpdate = false
  }
}

async function savePlaylistSettings() {
  operationInProgress.value.playlistSave = true
  try {
    await devicesStore.updatePlaylist(props.deviceId, {
      source: playlistSettings.value.source,
      destination: playlistSettings.value.destination
    })
    alertStore.success('Настройки плей-листа сохранены')
  } catch (err) {
    alertStore.error('Не удалось сохранить настройки плей-листа: ' + (err?.message || 'Неизвестная ошибка'))
  } finally {
    operationInProgress.value.playlistSave = false
  }
}

async function updateScheduleSettings() {
  operationInProgress.value.scheduleUpdate = true
  try {
    const result = await devicesStore.getSchedule(props.deviceId)
    applyScheduleValues(result || createDefaultScheduleValues())
  } catch (err) {
    alertStore.error('Не удалось загрузить настройки таймеров: ' + (err?.message || 'Неизвестная ошибка'))
  } finally {
    operationInProgress.value.scheduleUpdate = false
  }
}

async function saveScheduleSettings() {
  if (!scheduleFormRef.value) return
  const { valid } = await scheduleFormRef.value.validate()
  if (!valid) {
    alertStore.error('Исправьте ошибки в настройках таймеров, чтобы продолжить')
    return
  }

  // Get current reactive form values instead of initial scheduleFormValues
  const liveValues = scheduleFormRef.value.values || scheduleFormValues.value

  const payload = {
    playlist: [...(liveValues.playlist || [])],
    video: [...(liveValues.video || [])],
    rest: (liveValues.rest || []).map((item) => ({ start: item.start, stop: item.stop }))
  }
  
  operationInProgress.value.scheduleSave = true
  try {
    await devicesStore.updateSchedule(props.deviceId, payload)
    // Sync internal copy so reopening dialog shows what was just saved
    applyScheduleValues(payload)
    alertStore.success('Настройки таймеров сохранены')
  } catch (err) {
    alertStore.error('Не удалось сохранить настройки таймеров: ' + (err?.message || 'Неизвестная ошибка'))
  } finally {
    operationInProgress.value.scheduleSave = false
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
    
    // Show completion message based on operation type
    const completionMessages = {
      apply: 'Изменения применены, выполнен перезапуск сервисов',
      reboot: 'Устройство перезагружено',
      shutdown: 'Устройство выключено'
    }
    alertStore.success(completionMessages[key])
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
          <span>Управление устройством{{ device?.name ? ': ' + device.name : '' }}</span>
        </div>
      </v-card-title>
      <v-card-text>
        <div class="panel-grid">
          <fieldset class="panel">
            <legend class="primary-heading">Настройки таймеров</legend>
            <div class="panel-content timers-settings">
              <Form
                ref="scheduleFormRef"
                class="timers-form"
                :initial-values="scheduleFormValues"
                :validation-schema="scheduleValidationSchema"
                v-slot="{ errors: scheduleErrors }"
              >
                <div class="timers-grid">
                  <div class="timers-column">
                    <div class="timer-column-title">Загрузка плей-листа</div>
                    <FieldArrayWithButtons
                      name="playlist"
                      label=""
                      :hide-label="true"
                      field-type="input"
                      :field-props="timeFieldProps"
                      placeholder="HH:mm"
                      :default-value="defaultTimeValue"
                      :has-error="hasErrorsForPrefix(scheduleErrors, 'playlist')"
                      :disabled="isDisabled || hasAnyOperationInProgress"
                    />
                  </div>
                  <div class="timers-column">
                    <div class="timer-column-title">Загрузка видео</div>
                    <FieldArrayWithButtons
                      name="video"
                      label=""
                      :hide-label="true"
                      field-type="input"
                      :field-props="timeFieldProps"
                      placeholder="HH:mm"
                      :default-value="defaultTimeValue"
                      :has-error="hasErrorsForPrefix(scheduleErrors, 'video')"
                      :disabled="isDisabled || hasAnyOperationInProgress"
                    />
                  </div>
                  <div class="timers-column">
                    <div class="timer-column-title">Время отдыха</div>
                    <FieldArrayWithButtons
                      name="rest"
                      label="Время отдыха"
                      :hide-label="true"
                      :default-value="restDefaultValue"
                      :has-error="hasErrorsForPrefix(scheduleErrors, 'rest')"
                      :disabled="isDisabled || hasAnyOperationInProgress"
                    >
                      <template #field="{ fieldName: restFieldName }">
                        <div class="rest-field-pair">
                          <Field
                            :name="`${restFieldName}.start`"
                            :id="`${sanitizeFieldName(restFieldName)}_start`"
                            class="form-control input timer-input"
                            :class="{ 'is-invalid': hasErrorsForPrefix(scheduleErrors, `${restFieldName}.start`) }"
                            type="time"
                            step="60"
                            :disabled="isDisabled || hasAnyOperationInProgress"
                          />
                          <span class="rest-separator">—</span>
                          <Field
                            :name="`${restFieldName}.stop`"
                            :id="`${sanitizeFieldName(restFieldName)}_stop`"
                            class="form-control input timer-input"
                            :class="{ 'is-invalid': hasErrorsForPrefix(scheduleErrors, `${restFieldName}.stop`) }"
                            type="time"
                            step="60"
                            :disabled="isDisabled || hasAnyOperationInProgress"
                          />
                        </div>
                      </template>
                    </FieldArrayWithButtons>
                  </div>
                </div>
                <div class="timer-buttons">
                  <button
                    class="button-o-c"
                    type="button"
                    :disabled="isDisabled || hasAnyOperationInProgress"
                    @click="updateScheduleSettings"
                  >
                    <font-awesome-icon
                      size="1x"
                      :icon="operationInProgress.scheduleUpdate ? 'fa-solid fa-spinner' : 'fa-solid fa-rotate-right'"
                      :class="{ 'fa-spin': operationInProgress.scheduleUpdate }"
                      class="mr-1"
                    />
                    {{ operationInProgress.scheduleUpdate ? 'Читается...' : 'Прочитать' }}
                  </button>
                  <button
                    class="button-o-c"
                    type="button"
                    :disabled="isDisabled || hasAnyOperationInProgress"
                    @click="saveScheduleSettings"
                  >
                    <font-awesome-icon
                      size="1x"
                      :icon="operationInProgress.scheduleSave ? 'fa-solid fa-spinner' : 'fa-regular fa-save'"
                      :class="{ 'fa-spin': operationInProgress.scheduleSave }"
                      class="mr-1"
                    />
                    {{ operationInProgress.scheduleSave ? 'Сохраняется...' : 'Сохранить' }}
                  </button>
                </div>
              </Form>
            </div>
          </fieldset>

          <fieldset class="panel">
            <legend class="primary-heading">Настройки плей-листа</legend>
            <div class="panel-content playlist-settings">
              <div class="playlist-grid">
                <label class="playlist-label" for="playlist-source">Яндекс диск</label>
                <input
                  id="playlist-source"
                  v-model="playlistSettings.source"
                  type="text"
                  class="playlist-input"
                  :disabled="isDisabled || hasAnyOperationInProgress"
                />

                <label class="playlist-label" for="playlist-destination">Локальный диск</label>
                <input
                  id="playlist-destination"
                  v-model="playlistSettings.destination"
                  type="text"
                  class="playlist-input"
                  :disabled="isDisabled || hasAnyOperationInProgress"
                />
              </div>
              <div class="playlist-buttons">
                <button
                  class="button-o-c"
                  type="button"
                  :disabled="isDisabled || hasAnyOperationInProgress"
                  @click="updatePlaylistSettings"
                >
                  <font-awesome-icon
                    size="1x"
                    :icon="operationInProgress.playlistUpdate ? 'fa-solid fa-spinner' : 'fa-solid fa-rotate-right'"
                    :class="{ 'fa-spin': operationInProgress.playlistUpdate }"
                    class="mr-1"
                  />
                  {{ operationInProgress.playlistUpdate ? 'Читается...' : 'Прочитать' }}
                </button>
                <button
                  class="button-o-c"
                  type="button"
                  :disabled="isDisabled || hasAnyOperationInProgress"
                  @click="savePlaylistSettings"
                >
                  <font-awesome-icon
                    size="1x"
                    :icon="operationInProgress.playlistSave ? 'fa-solid fa-spinner' : 'fa-regular fa-save'"
                    :class="{ 'fa-spin': operationInProgress.playlistSave }"
                    class="mr-1"
                  />
                  {{ operationInProgress.playlistSave ? 'Сохраняется...' : 'Сохранить' }}
                </button>
              </div>
            </div>
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
                {{ operationInProgress.apply ? 'Изменения применяются...' : 'Применить изменения' }}
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
      <div v-if="alert" class="alert alert-dismissable" :class="alert.type">
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

.timers-settings {
  display: flex;
  justify-content: center;
}

.timers-form {
  width: 100%;
}

.timers-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1.67fr;
  gap: 0 0.2rem;
}

.timers-column {
  border: 1px dashed var(--primary-color);
  border-radius: 8px;
  padding: 0.75rem;
  background-color: rgba(0, 0, 0, 0.02);
}

.timer-column-title {
  text-align: center;
  margin-bottom: 0.5rem;
}

.timer-buttons {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
}

.rest-field-pair {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.timer-input {
  min-width: 90px;
}

.rest-separator {
  font-weight: 600;
  color: var(--text-color);
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

.playlist-settings {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.playlist-grid {
  display: grid;
  grid-template-columns: 140px 1fr;
  grid-auto-rows: auto;
  gap: 0.5rem 0.75rem;
  align-items: center;
  width: 100%;
  margin-bottom: 1rem;
}

.playlist-buttons {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.playlist-label {
  font-size: 1rem;
  color: var(--text-color);
}

.playlist-input {
  padding: 0 0.75rem;
  height: 36px;
  line-height: 36px;
  box-sizing: border-box;
  border: 1px solid var(--primary-color);
  border-radius: 4px;
  background-color: var(--background-color);
  color: var(--text-color);
  width: 100%;
}

.playlist-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* playlist-status column removed */

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

.alert {
  margin: 1rem;
  padding: 1rem;
  border-radius: 8px;
}
</style>
