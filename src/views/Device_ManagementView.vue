// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import DeviceManagement from '@/components/Device_Management.vue'

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
      <DeviceManagement :device-id="deviceId" />
    </template>
    <template v-else>
      <div class="text-center m-5 text-danger">
        <div class="mt-2">Некорректный идентификатор устройства.</div>
      </div>
    </template>
    <template #fallback>
      <div class="text-center m-5">
        <span class="spinner-border spinner-border-lg align-center"></span>
        <div class="mt-2">Загрузка информации об устройстве...</div>
      </div>
    </template>
  </Suspense>
</template>
