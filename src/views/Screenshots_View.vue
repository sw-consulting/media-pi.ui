// Copyright (c) 2026 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import { computed } from 'vue'
import ScreenshotsList from '@/components/Screenshots_List.vue'

const props = defineProps({
  id: {
    type: String,
    required: true
  }
})

const deviceId = computed(() => {
  if (typeof props.id !== 'string' || !/^\d+$/.test(props.id)) return null
  const n = parseInt(props.id, 10)
  return n > 0 ? n : null
})
</script>

<template>
  <Suspense>
    <template v-if="deviceId !== null">
      <ScreenshotsList :device-id="deviceId" />
    </template>
    <template v-else>
      <div class="text-center m-5 text-danger">
        <div class="mt-2">Некорректный идентификатор устройства.</div>
      </div>
    </template>
    <template #fallback>
      <div class="text-center m-5">
        <span class="spinner-border spinner-border-lg align-center"></span>
        <div class="mt-2">Загрузка скриншотов устройства...</div>
      </div>
    </template>
  </Suspense>
</template>
