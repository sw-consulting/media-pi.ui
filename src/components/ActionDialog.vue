// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

<script setup>
import { watch, ref, getCurrentInstance, computed } from 'vue'

const props = defineProps({
  // actionDialog is an object with { show: boolean, title?: string }
  actionDialog: { type: Object, required: true },
  // Optional minimum ms to keep dialog visible once shown
  minMs: { type: Number, default: 2000 }
})
const emit = defineEmits(['hidden'])

// Detect whether Vuetify components are globally registered (tests may not register them)
const instance = getCurrentInstance()
const hasVuetify = computed(() => Boolean(instance?.appContext?.components?.VDialog))

const actionDialogTitle = computed(() => props.actionDialog?.title ?? 'Пожалуйста, подождите')

// Internal visible state is controlled here to enforce min display time.
const internalVisible = ref(false)
let shownAt = 0
let hideTimer = null

const showInternal = () => {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
  shownAt = Date.now()
  internalVisible.value = true
}

const hideInternal = () => {
  const elapsed = Date.now() - shownAt
  const remaining = Math.max(0, props.minMs - elapsed)
  if (remaining === 0) {
    internalVisible.value = false
    // Reflect back to caller
    emit('hidden')
  } else {
    hideTimer = setTimeout(() => {
      internalVisible.value = false
      hideTimer = null
      emit('hidden')
    }, remaining)
  }
}

// Watch caller's requested flag and act accordingly
watch(() => props.actionDialog?.show, (val) => {
  if (val) {
    showInternal()
  } else {
    // Caller requested hide — respect min display
    hideInternal()
  }
})
</script>

<template>
  <template v-if="hasVuetify">
    <v-dialog :model-value="internalVisible" width="300" persistent>
      <v-card>
        <v-card-title class="primary-heading">
          {{ actionDialogTitle }}
        </v-card-title>
        <v-card-text class="text-center">
          <v-progress-circular :model-value="0" indeterminate :size="70" :width="7" color="primary" />
        </v-card-text>
      </v-card>
    </v-dialog>
  </template>
  <template v-else>
    <div v-if="internalVisible" class="mp-action-overlay" role="dialog" aria-modal="true">
      <div class="mp-action-card">
        <div class="primary-heading mp-action-title">{{ actionDialogTitle }}</div>
        <div class="mp-action-spinner" aria-hidden="true"></div>
      </div>
    </div>
  </template>
</template>

<style scoped>
.mp-action-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.4);
  z-index: 2000;
}
.mp-action-card {
  background: #fff;
  padding: 1rem 1.25rem;
  border-radius: 8px;
  min-width: 260px;
  max-width: 90%;
  text-align: center;
  box-shadow: 0 6px 24px rgba(0,0,0,0.2);
}
.mp-action-title { margin-bottom: .5rem }
.mp-action-spinner { display:inline-block;width:48px;height:48px;border-radius:50%;border:6px solid rgba(0,0,0,0.08);border-top-color:var(--v-primary-base, #1976d2);animation:mp-spin 1s linear infinite }
@keyframes mp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
