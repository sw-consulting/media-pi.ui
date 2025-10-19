// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // actionDialog is an object with { show: boolean, title?: string }
  actionDialog: { type: Object, required: true },
  // Optional minimum ms to keep dialog visible once shown
  minMs: { type: Number, default: 2000 }
})

import { watch, ref } from 'vue'
const emit = defineEmits(['hidden'])

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
