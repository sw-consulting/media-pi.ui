// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

<script setup>
import DeviceManagement from '@/components/Device_Management.vue'

const props = defineProps({
  id: {
    type: String,
    required: true
  }
})

const deviceId = parseInt(props.id, 10)
</script>

<template>
  <Suspense>
    <DeviceManagement :device-id="deviceId" />
    <template #fallback>
      <div class="text-center m-5">
        <span class="spinner-border spinner-border-lg align-center"></span>
        <div class="mt-2">Загрузка информации об устройстве...</div>
      </div>
    </template>
  </Suspense>
</template>
