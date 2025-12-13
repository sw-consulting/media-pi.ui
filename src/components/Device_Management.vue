// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application
<script setup>

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'

import { useDevicesStore } from '@/stores/devices.store.js'
import { useDeviceStatusesStore } from '@/stores/device.statuses.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { timeouts } from '@/helpers/config.js'
import FieldArrayWithButtons from '@/components/FieldArrayWithButtons.vue'
import { ActionButton } from '@sw-consulting/tooling.ui.kit'

const props = defineProps({
  deviceId: { type: Number, required: true }
})

const devicesStore = useDevicesStore()
const deviceStatusesStore = useDeviceStatusesStore()
const alertStore = useAlertStore()
const router = useRouter()
const alertRefs = storeToRefs(alertStore) || {}
const alert = alertRefs.alert

const clearAlert = () => {
  if (alertStore && typeof alertStore.clear === 'function') alertStore.clear()
}
const { statuses } = storeToRefs(deviceStatusesStore)

// Manual refresh override removed here; other components may still use it.

const defaultServiceStatus = Object.freeze({
  playbackServiceStatus: false,
  playlistUploadServiceStatus: false,
  videoUploadServiceStatus: false,
  yaDiskMountStatus: false
})
const serviceStatus = ref({ ...defaultServiceStatus })

const defaultServiceOperationTimeout = 3000

const serviceDescriptors = Object.freeze([
  {
    key: 'playback',
    label: 'Воспроизведение',
    statusKey: 'playbackServiceStatus',
    activeLabel: 'Запущено',
    inactiveLabel: 'Остановлено',
    startLabel: 'Запустить',
    stopLabel: 'Остановить',
    startOperationKey: 'startPlaybackService',
    stopOperationKey: 'stopPlaybackService',
    startHandler: devicesStore.startPlayback,
    stopHandler: devicesStore.stopPlayback,
    successMessages: {
      start: 'Выполнен запуск службы воспроизведения',
      stop: 'Выполнена остановка службы воспроизведения'
    }
  },
  {
    key: 'playlistUpload',
    label: 'Загрузка плейлистов',
    statusKey: 'playlistUploadServiceStatus',
    activeLabel: 'Запущена',
    inactiveLabel: 'Остановлена',
    startLabel: 'Запустить',
    stopLabel: 'Остановить',
    startOperationKey: 'startPlaylistUploadService',
    stopOperationKey: 'stopPlaylistUploadService',
    startHandler: devicesStore.startPlaylistUpload,
    stopHandler: devicesStore.stopPlaylistUpload,
    successMessages: {
      start: 'Выполнен запуск службы загрузки плейлистов',
      stop: 'Выполнена остановка службы загрузки плейлистов'
    }
  },
  {
    key: 'videoUpload',
    label: 'Загрузка видео',
    statusKey: 'videoUploadServiceStatus',
    activeLabel: 'Запущена',
    inactiveLabel: 'Остановлена',
    startLabel: 'Запустить',
    stopLabel: 'Остановить',
    startOperationKey: 'startVideoUploadService',
    stopOperationKey: 'stopVideoUploadService',
    startHandler: devicesStore.startVideoUpload,
    stopHandler: devicesStore.stopVideoUpload,
    successMessages: {
      start: 'Выполнен запуск службы загрузки видео',
      stop: 'Выполнена остановка службы загрузки видео'
    }
  },
  {
    key: 'yadisk',
    label: 'Яндекс диск',
    statusKey: 'yaDiskMountStatus',
    activeLabel: 'Смонтирован',
    inactiveLabel: 'Не смонтирован'
  }
])

// Track ongoing operations to disable controls
const baseOperationFlags = {
  apply: false,
  readAll: false,
  saveAll: false,
  reboot: false,
  shutdown: false,
  audioUpdate: false,
  audioSave: false,
  playlistUpdate: false,
  playlistSave: false,
  scheduleUpdate: false,
  scheduleSave: false,
  serviceStatus: false
}

const createServiceOperationState = (initialValue) => Object.fromEntries(
  serviceDescriptors
    .flatMap(({ startOperationKey, stopOperationKey }) => [startOperationKey, stopOperationKey])
    .filter(Boolean)
    .map((key) => [key, initialValue])
)

const operationInProgress = ref({ ...baseOperationFlags, ...createServiceOperationState(false) })

const systemOperationTimers = ref({
  apply: null,
  reboot: null,
  shutdown: null,
  ...createServiceOperationState(null)
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

const createDefaultConfiguration = () => ({
  playlist: { source: '', destination: '' },
  schedule: createDefaultScheduleValues(),
  audio: { output: 'hdmi' }
})

const normalizeConfiguration = (config = {}) => {
  const allowedOutputs = ['hdmi', 'jack']
  const rawAudioOutput = typeof config?.audio?.output === 'string'
    ? config.audio.output.trim().toLowerCase()
    : ''
  const audioFallback = !allowedOutputs.includes(rawAudioOutput)

  return {
    playlist: {
      source: typeof config?.playlist?.source === 'string' ? config.playlist.source : '',
      destination: typeof config?.playlist?.destination === 'string' ? config.playlist.destination : ''
    },
    schedule: {
      playlist: normalizeTimeList(config?.schedule?.playlist),
      video: normalizeTimeList(config?.schedule?.video),
      rest: normalizeRestList(config?.schedule?.rest)
    },
    audio: {
      output: audioFallback ? 'hdmi' : rawAudioOutput
    },
    audioFallback
  }
}

const applyConfiguration = (configuration, originalConfig = {}) => {
  const normalized = configuration ?? createDefaultConfiguration()
  playlistSettings.value.source = normalized.playlist.source
  playlistSettings.value.destination = normalized.playlist.destination
  applyScheduleValues(normalized.schedule)

  if (normalized.audioFallback && originalConfig?.audio) {
    alertStore.error('Неизвестный тип аудио выхода. Установлено значение по умолчанию: HDMI')
  }
  audioSettings.value.output = normalized.audio.output
}

const buildSchedulePayload = (values) => ({
  playlist: [...normalizeTimeList(values?.playlist)],
  video: [...normalizeTimeList(values?.video)],
  rest: normalizeRestList(values?.rest).map((item) => ({ start: item.start, stop: item.stop }))
})

const buildConfigurationPayload = (scheduleValuesOverride) => ({
  playlist: {
    source: playlistSettings.value.source || '',
    destination: playlistSettings.value.destination || ''
  },
  schedule: buildSchedulePayload(scheduleValuesOverride ?? scheduleFormValues.value),
  audio: {
    output: ['hdmi', 'jack'].includes(audioSettings.value.output) ? audioSettings.value.output : 'hdmi'
  }
})


const componentActive = ref(true)

// Ported initial loading pattern from Device_Settings.vue
const { device, loading } = storeToRefs(devicesStore)

const loadDevice = async () => {
  if (!props.deviceId) {
    return
  }
  try {
    await devicesStore.getById(props.deviceId)
  } catch (err) {
    alertStore.error('Не удалось загрузить устройство: ' + (err?.message || 'Неизвестная ошибка'))
  } 
}

const currentStatus = computed(() => {
  const id = props.deviceId
  if (!id) return null

  // If user refreshed, prefer that value over SSE
  const live = (statuses.value || []).find((s) => s?.deviceId === id)
  if (live) return live

  return device.value?.deviceStatus || null
})

async function fetchDeviceStatus() {
  if (!props.deviceId) return
  try {
    // Fetch latest status; the store updates `statuses` so we don't keep a local override.
    await deviceStatusesStore.getById(props.deviceId)
  } catch (err) {
    alertStore.error('Не удалось обновить статус устройства: ' + (err?.message || 'Неизвестная ошибка'))
  }
}

onMounted(async () => {
  if (props.deviceId) {
    await initializeDevice()
  }
})

watch(() => props.deviceId, async () => {
  resetSystemOperations()
  resetServiceStatus()
  if (props.deviceId) {
    await initializeDevice()
  }
})

watch(() => currentStatus.value?.isOnline, async (isOnline, wasOnline) => {
  // Only load audio settings when device comes online (was offline, now online)
  if (isOnline && wasOnline === false && props.deviceId) {
    await readAllSettings()
  } else if (isOnline === false) {
    resetServiceStatus()
  }
})

async function initializeDevice() {
  if (!props.deviceId) return

  // Load device first (initial loading sequence)
  await loadDevice()
  await fetchDeviceStatus()

  // Only load audio settings if device is online, otherwise set default
  const status = currentStatus.value
  if (status?.isOnline) {
    await readAllSettings()
  } else {
    resetServiceStatus()
    // Set default audio value silently when device is offline
    audioSettings.value.output = 'hdmi'
    playlistSettings.value.source = ''
    playlistSettings.value.destination = ''
    applyScheduleValues(createDefaultScheduleValues())
  }
}

const onlineClass = computed(() => currentStatus.value?.isOnline ? 'text-success' : 'text-danger')

const isDisabled = computed(() => !currentStatus.value?.isOnline)
const hasAnyOperationInProgress = computed(() =>
  Object.values(operationInProgress.value).some(Boolean)
)

// Device information display helpers
const fmtDate = (value) => {
  if (!value) return '—'
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    // Force Russian locale and a consistent date/time format
    return d.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return String(value)
  }
}

const deviceInfo = computed(() => {
  const dev = device.value
  const status = currentStatus.value
  return {
    name: dev?.name || '—',
    ipAddress: dev?.ipAddress || '—',
    softwareVersion: status?.softwareVersion || '—',
    isOnline: status?.isOnline ? 'Да' : 'Нет',
    lastChecked: fmtDate(status?.lastChecked),
    connectLatencyMs: status?.connectLatencyMs ?? '—'
  }
})

const serviceOperationConfigs = serviceDescriptors.reduce((acc, descriptor) => {
  if (descriptor.startOperationKey) {
    acc[descriptor.startOperationKey] = {
      handler: descriptor.startHandler,
      timeout: descriptor.timeout ?? defaultServiceOperationTimeout,
      successMessage: descriptor.successMessages?.start
    }
  }
  if (descriptor.stopOperationKey) {
    acc[descriptor.stopOperationKey] = {
      handler: descriptor.stopHandler,
      timeout: descriptor.timeout ?? defaultServiceOperationTimeout,
      successMessage: descriptor.successMessages?.stop
    }
  }
  return acc
}, {})

const createServiceActionRunner = (operationKey) => async () => {
  const config = serviceOperationConfigs[operationKey]
  if (!config) return
  await runServiceOperation(operationKey, config.handler, config.timeout, config.successMessage)
}

const serviceActionRunners = Object.fromEntries(
  Object.keys(serviceOperationConfigs).map((key) => [key, createServiceActionRunner(key)])
)

const serviceRows = computed(() => {
  const status = serviceStatus.value || defaultServiceStatus
  return serviceDescriptors.map((descriptor) => {
    const isActive = Boolean(status[descriptor.statusKey])
    const hasActions = Boolean(descriptor.startOperationKey && descriptor.stopOperationKey)
    const operationKey = isActive ? descriptor.stopOperationKey : descriptor.startOperationKey
    return {
      key: descriptor.key,
      label: descriptor.label,
      isActive,
      statusLabel: isActive ? descriptor.activeLabel : descriptor.inactiveLabel,
      actionLabel: hasActions ? (isActive ? descriptor.stopLabel : descriptor.startLabel) : null,
      action: hasActions ? serviceActionRunners[operationKey] : null,
      operationKey
    }
  })
})

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

const loadConfiguration = async (errorPrefix = 'Не удалось загрузить настройки') => {
  try {
    const configuration = await devicesStore.getConfiguration(props.deviceId)
    const normalized = normalizeConfiguration(configuration || createDefaultConfiguration())
    applyConfiguration(normalized, configuration)
    return true
  } catch (err) {
    alertStore.error(`${errorPrefix}: ${err?.message || 'Неизвестная ошибка'}`)
    return false
  }
}

const persistConfiguration = async ({
  successMessage,
  errorPrefix = 'Не удалось сохранить настройки'
} = {}) => {
  const formRef = scheduleFormRef.value

  // Always validate when the form is mounted
  if (formRef) {
    const validationResult = await formRef.validate()
    if (!validationResult.valid) {
      alertStore.error('Исправьте ошибки в настройках таймеров, чтобы продолжить')
      return false
    }
  }

  // Prefer live form values when form is mounted; fallback to internal values
  const scheduleValues = formRef?.values ?? scheduleFormValues.value

  const payload = buildConfigurationPayload(scheduleValues)

  try {
    await devicesStore.updateConfiguration(props.deviceId, payload)
    // always apply schedule values from saved payload so internal state reflects saved data
    applyScheduleValues(payload.schedule)
    if (successMessage) {
      alertStore.success(successMessage)
    }
    return true
  } catch (err) {
    alertStore.error(`${errorPrefix}: ${err?.message || 'Неизвестная ошибка'}`)
    return false
  }
}

const applyServiceStatus = (payload = {}) => {
  serviceStatus.value = { ...defaultServiceStatus, ...payload }
}

const resetServiceStatus = () => {
  applyServiceStatus(defaultServiceStatus)
}

async function updateServiceStatus() {
  if (!props.deviceId) return
  operationInProgress.value.serviceStatus = true
  try {
    const result = await devicesStore.getServiceStatus(props.deviceId)
    applyServiceStatus(result)
    return true
  } catch (err) {
    alertStore.error('Не удалось получить статус сервисов: ' + (err?.message || 'Неизвестная ошибка'))
    return false
  } finally {
    operationInProgress.value.serviceStatus = false
  }
}

async function readAllSettings() {
  operationInProgress.value.readAll = true
  try {
    await Promise.all([
      fetchDeviceStatus(),
      updateServiceStatus(),
      loadConfiguration('Не удалось загрузить настройки конфигурации')
    ])
  } finally {
    operationInProgress.value.readAll = false
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

const runServiceOperation = async (key, handler, timeout, successMessage) => {
  if (!serviceOperationConfigs[key]) return
  resetSystemOperationTimer(key)
  operationInProgress.value[key] = true
  const success = await runWithDevice(handler)
  if (!success) {
    operationInProgress.value[key] = false
    return
  }

  const deviceIdAtStart = props.deviceId
  systemOperationTimers.value[key] = setTimeout(async () => {
    if (!componentActive.value || props.deviceId !== deviceIdAtStart) {
      operationInProgress.value[key] = false
      return
    }
    await updateServiceStatus()
    operationInProgress.value[key] = false
    systemOperationTimers.value[key] = null

    // Show completion message based on operation type
    if (successMessage) {
      alertStore.success(successMessage)
    }
  }, timeout)
}

const runSystemOperation = async (key, handler, timeout) => {
  if (!['reboot', 'shutdown'].includes(key)) return
  resetSystemOperationTimer(key)
  operationInProgress.value[key] = true
  const success = await runWithDevice(handler)
  if (!success) {
    operationInProgress.value[key] = false
    return
  }

  const deviceIdAtStart = props.deviceId
  systemOperationTimers.value[key] = setTimeout(async () => {
    if (!componentActive.value || props.deviceId !== deviceIdAtStart) {
      operationInProgress.value[key] = false
      return
    }
    await fetchDeviceStatus()
    operationInProgress.value[key] = false
    systemOperationTimers.value[key] = null
    
    // Show completion message based on operation type
    const completionMessages = {
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
  if (operationInProgress.value.apply) return
  
  resetSystemOperationTimer('apply')
  operationInProgress.value.apply = true
  
  try {
    // Save current form values (with validation)
    const success = await persistConfiguration({
      errorPrefix: 'Не удалось сохранить настройки'
    })
    
    if (!success) {
      operationInProgress.value.apply = false
      return
    }
    
    // Set timeout for completion message
    const deviceIdAtStart = props.deviceId
    systemOperationTimers.value.apply = setTimeout(async () => {
      if (!componentActive.value || props.deviceId !== deviceIdAtStart) {
        operationInProgress.value.apply = false
        return
      }
      await fetchDeviceStatus()
      operationInProgress.value.apply = false
      systemOperationTimers.value.apply = null
      alertStore.success('Настройки сохранены, выполнен перезапуск сервисов')
    }, timeouts.apply)
  } catch (err) {
    operationInProgress.value.apply = false
    alertStore.error('Не удалось сохранить настройки: ' + (err?.message || 'Неизвестная ошибка'))
  }
}

const reboot = async () => {
  await runSystemOperation('reboot', devicesStore.rebootSystem, timeouts.reboot)
}

const shutdown = async () => {
  await runSystemOperation('shutdown', devicesStore.shutdownSystem, timeouts.shutdown)
}

onBeforeUnmount(() => {
  componentActive.value = false
  resetSystemOperations()
  clearAlert()
})
</script>

<template>
  <div class="settings form-4 form-compact">
    <div class="header-with-actions">
      <h1 class="primary-heading">
        <font-awesome-icon
          :icon="currentStatus?.isOnline ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'"
          :class="onlineClass"
          class="mr-2"
        />
        <span>
          <template v-if="!device">Загрузка...</template>
          <template v-else-if="device?.name">{{ device.name }}</template>
          <template v-else>Устройство {{ props.deviceId }}</template>
        </span>
      </h1>
       <div class="flex-center">
        <div v-if="loading || hasAnyOperationInProgress" class="header-actions header-actions-group">
          <span class="spinner-border"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton 
            icon="fa-solid fa-xmark" 
            iconSize="2x" 
            tooltipText="Выход из настроек устройства"
            :item="{}"
            @click="router.go(-1)"
          />
        </div>
      </div>
    </div>
    <hr class="hr" />

    <!-- Device Information Section -->
    <div class="form-group mt-4 form-group-add">
      <h2 class="secondary-header">Об устройстве</h2>
      <div class="device-info-grid">
        <div class="label service-label">Название</div>
        <div class="value">{{ deviceInfo.name }}</div>

        <div class="label service-label">IP адрес</div>
        <div class="value">{{ deviceInfo.ipAddress }}</div>

        <div class="label service-label">Версия агента</div>
        <div class="value">{{ deviceInfo.softwareVersion }}</div>

        <div class="label service-label">Онлайн</div>
        <div class="value">
          <span :class="onlineClass">
            {{ deviceInfo.isOnline }}
          </span>
        </div>

        <div class="label service-label">Последняя проверка</div>
        <div class="value">{{ deviceInfo.lastChecked }}</div>

        <div class="label service-label">Задержка</div>
        <div class="value">{{ deviceInfo.connectLatencyMs }}{{ deviceInfo.connectLatencyMs !== '—' ? ' мс' : '' }}</div>
      </div>
    </div>

    <!-- Service Management Section -->
    <div class="form-group mt-4 form-group-add">
      <h2 class="secondary-header">Управление сервисами</h2>
      <div class="service-grid">
        <template v-for="row in serviceRows" :key="row.key">
          <div class="service-cell label service-label">{{ row.label }}</div>
          <div
            class="service-cell service-status"
            :class="row.isActive ? 'text-success' : 'text-danger'"
          >
            {{ row.statusLabel }}
          </div>
          <div class="service-cell service-action">
            <ActionButton
              v-if="row.action"
              :icon="
                operationInProgress[row.operationKey]
                  ? 'fa-solid fa-spinner'
                  : row.isActive
                    ? 'fa-solid fa-stop'
                    : 'fa-solid fa-play'
              "
              iconSize="1x"
              :tooltipText="operationInProgress[row.operationKey]
                ? (row.isActive ? 'Останавливается...' : 'Запускается...')
                : row.actionLabel"
              :item="{}"
              :class="{ 'fa-spin': operationInProgress[row.operationKey] }"
              :data-test="`service-action-${row.key}`"
              :disabled="
                isDisabled ||
                hasAnyOperationInProgress ||
                operationInProgress[row.operationKey] ||
                operationInProgress.serviceStatus
              "
              @click="row.action"
            />
          </div>
        </template>
      </div>
    </div>

    <!-- Schedule Settings Section -->
    <div class="form-group mt-4 form-group-add">
      <h2 class="secondary-header">Настройки таймеров</h2>
      <Form
        ref="scheduleFormRef"
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
      </Form>
    </div>

    <!-- Playlist Settings Section -->
    <div class="form-group mt-4 form-group-add">
      <h2 class="secondary-header">Настройки плей-листа</h2>
      <div class="playlist-grid">
        <div class="form-group">
        <label class="label" for="playlist-source">Яндекс диск:</label>
        <input
          id="playlist-source"
          v-model="playlistSettings.source"
          type="text"
          class="form-control input"
          :disabled="isDisabled || hasAnyOperationInProgress"
          placeholder="Путь к источнику на Яндекс диске"
        />
        </div>
        <div class="form-group">
        <label class="label" for="playlist-destination">Локальный диск:</label>
        <input
          id="playlist-destination"
          v-model="playlistSettings.destination"
          type="text"
          class="form-control input"
          :disabled="isDisabled || hasAnyOperationInProgress"
          placeholder="Путь к локальному диске"
        />
        </div>
      </div>
    </div>

    <!-- Audio Settings Section -->
    <div class="form-group mt-4 form-group-add">
      <h2 class="secondary-header">Настройки аудио</h2>
      <div class="form-group">
        <label for="audio-output" class="label">Аудиовыход:</label>
        <select
          id="audio-output"
          v-model="audioSettings.output"
          class="form-control input"
          :disabled="isDisabled || hasAnyOperationInProgress"
        >
          <option value="hdmi">HDMI audio</option>
          <option value="jack">3.5" jack audio</option>
        </select>
      </div>
    </div>

    <!-- System Management Section -->
    <div class="form-group mt-4 form-group-add">
      <h2 class="secondary-header">Управление системой</h2>
      <div class="system-actions">
        <ActionButton
          :icon="operationInProgress.readAll ? 'fa-solid fa-spinner' : 'fa-solid fa-rotate-right'"
          iconSize="2x"
          :tooltipText="operationInProgress.readAll ? 'Информация обновляется...' : 'Обновить информацию'"
          :item="{}"
          :class="{ 'fa-spin': operationInProgress.readAll }"
          data-test="system-read"
          :disabled="hasAnyOperationInProgress"
          @click="readAllSettings"
        />
        <ActionButton
          :icon="operationInProgress.apply ? 'fa-solid fa-spinner' : 'fa-solid fa-download'"
          iconSize="2x"
          :tooltipText="operationInProgress.apply ? 'Сохраняются настройки...' : 'Сохранить и применить настройки'"
          :item="{}"
          :class="{ 'fa-spin': operationInProgress.apply }"
          data-test="system-apply"
          :disabled="isDisabled || hasAnyOperationInProgress"
          @click="apply"
        />
        <ActionButton
          :icon="operationInProgress.reboot ? 'fa-solid fa-spinner' : 'fa-solid fa-retweet'"
          iconSize="2x"
          :tooltipText="operationInProgress.reboot ? 'Перезагружается...' : 'Перезагрузить устройство'"
          :item="{}"
          :class="{ 'fa-spin': operationInProgress.reboot }"
          data-test="system-reboot"
          :disabled="isDisabled || hasAnyOperationInProgress"
          @click="reboot"
        />
        <ActionButton
          :icon="operationInProgress.shutdown ? 'fa-solid fa-spinner' : 'fa-solid fa-power-off'"
          iconSize="2x"
          :tooltipText="operationInProgress.shutdown ? 'Выключается...' : 'Выключить устройство'"
          :item="{}"
          :class="{ 'fa-spin': operationInProgress.shutdown }"
          data-test="system-shutdown"
          :disabled="isDisabled || hasAnyOperationInProgress"
          @click="shutdown"
        />
      </div>
    </div>

    <!-- Alert Section -->
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>

<style scoped>

.form-compact {
  overflow-x: auto;
  max-width: 1200px;  
}

.header-with-actions {
  margin-right: 0.5rem;
}

.secondary-header {
  font-size: 1.5rem;
  font-weight: 500;
  width: 25%;
  min-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  flex-shrink: 0;
  color: #1976d2;
  transition: 0.4s;
}

.form-group-add {
  padding: 1rem;
  border: 1px solid  #536373;
  border-radius: 8px;
  min-width: 1200px;
  width: 1200px;
}

.device-info-grid {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 0.5rem 1rem;
  align-items: center;
  padding: 1rem 0;
}

.service-grid {
  display: grid;
  grid-template-columns:200px 1fr auto;
  gap: 0.7rem;
}

.service-cell {
  display: flex;
  align-items: center;
}

.service-label {
  width:  140px;
}

.service-action {
  justify-content: flex-start;
}

.timers-grid {
  display: grid;
  grid-template-columns: 0.5fr 0.5fr 0.7fr;
  gap: 1rem;
}

.timers-column {
  border: 1px solid  #536373;
  border-radius: 8px;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.02);
}

.playlist-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  width: 100%;
}

.playlist-grid .form-group {
  margin-bottom: 0;
}

.playlist-grid .label {
  width: 30%;
  min-width: auto;
} 

.playlist-grid .input {
  width: 70%;
  min-width: auto;
} 

@media (max-width: 1000px) {
  .timers-grid {
    grid-template-columns: 0.7fr;
  }
  .playlist-grid {
    grid-template-columns: 0.7fr;
  }
  .form-group-add {
    min-width: auto;
    width: auto;
    border: none;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .secondary-header {
    width: 100%;
    min-width: 0;
    margin-bottom: 0.75rem;
  }

}

.timer-column-title {
  text-align: center;
  margin-bottom: 0.75rem;
  font-weight: 500;
}

.rest-field-pair {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.timer-input {
  min-width: 30px;
}

.rest-separator {
  color: var(--text-color);
  font-weight: bold;
}

.system-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
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
