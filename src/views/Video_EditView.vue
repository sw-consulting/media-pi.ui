// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import VideoSettings from '@/components/Video_Settings.vue'

const props = defineProps({
  id: {
    type: String,
    required: true
  }
})
const id = parseInt(props.id, 10)
</script>

<template>
  <Suspense>
    <VideoSettings :id="id" />
    <template #fallback>
      <div class="text-center m-5">
        <span class="spinner-border spinner-border-lg align-center"></span>
        <div class="mt-2">Загрузка информации о видеофайле...</div>
      </div>
    </template>
  </Suspense>
</template>
