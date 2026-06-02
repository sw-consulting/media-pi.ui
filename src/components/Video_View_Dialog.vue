// Copyright (c) 2026 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { ActionButton } from '@sw-consulting/tooling.ui.kit'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  video: { type: Object, default: null },
  title: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'playback-error'])

const videoRef = ref(null)
const playbackErrorMessage = ref('')
const isClosing = ref(false)

const dialogTitle = computed(() => props.title || props.video?.filename || 'Видео')
const streamUrl = computed(() => props.video?.streamUrl || '')
const unsupportedStreamingMessage = 'Стриминг этого видеофайла не поддерживается браузером.'

const mediaErrorCodes = {
  aborted: 1,
  network: 2,
  decode: 3,
  sourceNotSupported: 4
}

function clearPlaybackError() {
  playbackErrorMessage.value = ''
}

function resetPlaybackState() {
  clearPlaybackError()
}

function resetPlayback() {
  const videoElement = videoRef.value
  if (!videoElement) return

  videoElement.pause()
  videoElement.currentTime = 0
}

async function startPlayback() {
  await nextTick()

  if (!props.modelValue || !streamUrl.value) return

  const videoElement = videoRef.value
  if (!videoElement?.play) return

  try {
    const playResult = videoElement.play()
    playResult?.catch?.(() => {})
  } catch {
    // Browsers may block unmuted autoplay; keep native controls available.
  }
}

function handleVideoError(event) {
  const mediaError = videoRef.value?.error || event?.target?.error
  const code = mediaError?.code

  if (code === mediaErrorCodes.aborted && isClosing.value) return

  if (code === mediaErrorCodes.sourceNotSupported || code === mediaErrorCodes.decode) {
    emit('playback-error', unsupportedStreamingMessage)
    updateDialog(false)
    return
  }

  if (code === mediaErrorCodes.network) {
    playbackErrorMessage.value = 'Не удалось загрузить видеофайл'
  }
}

function updateDialog(value) {
  if (!value) {
    isClosing.value = true
    resetPlaybackState()
    resetPlayback()
  }
  emit('update:modelValue', value)
}

function closeDialog() {
  updateDialog(false)
}

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    isClosing.value = false
    resetPlaybackState()
    startPlayback()
    return
  }

  isClosing.value = true
  resetPlaybackState()
  resetPlayback()
})

watch(streamUrl, () => {
  isClosing.value = false
  resetPlaybackState()
  startPlayback()
})
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="1100"
    @update:model-value="updateDialog"
  >
    <v-card class="video-dialog-card">
      <div class="video-dialog-header">
        <h2 class="secondary-heading video-dialog-title">{{ dialogTitle }}</h2>
        <ActionButton
          data-test="close-video-dialog"
          :item="{}"
          icon="fa-solid fa-xmark"
          tooltipText="Закрыть"
          @click="closeDialog"
        />
      </div>

      <div class="video-dialog-body">
        <video
          v-if="streamUrl"
          ref="videoRef"
          class="video-dialog-player"
          :src="streamUrl"
          controls
          autoplay
          preload="metadata"
          data-test="video-player"
          @error="handleVideoError"
        />
        <div
          v-if="playbackErrorMessage"
          class="video-dialog-error alert alert-danger"
          data-test="video-playback-error"
        >
          {{ playbackErrorMessage }}
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.video-dialog-card {
  max-height: 90vh;
  overflow: hidden;
}

.video-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #536373;
}

.video-dialog-title {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-dialog-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  max-height: calc(90vh - 72px);
  padding: 1rem;
  overflow: auto;
  background: #101820;
}

.video-dialog-player {
  display: block;
  width: 100%;
  max-height: calc(90vh - 104px);
  background: #000;
}

.video-dialog-error {
  width: 100%;
  margin: 0;
}
</style>
