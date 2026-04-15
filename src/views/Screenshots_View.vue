// Copyright (c) 2026 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import ScreenshotsList from '@/components/Screenshots_List.vue'

const props = defineProps({
  id: {
    type: String,
    required: true
  }
})

const deviceId = (typeof props.id === 'string' && /^\d+$/.test(props.id)) ? parseInt(props.id, 10) : null
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
        <div class="mt-2">Загрузка снимков устройства...</div>
      </div>
    </template>
  </Suspense>
</template>
