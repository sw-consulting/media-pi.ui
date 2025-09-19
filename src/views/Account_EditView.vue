// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi backend

<script setup>
import AccountSettings from '@/components/Account_Settings.vue'

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
    <AccountSettings :register="false" :id="id" />
    <template #fallback>
      <div class="text-center m-5">
        <span class="spinner-border spinner-border-lg align-center"></span>
        <div class="mt-2">Загрузка информации о лицевом счёте...</div>
      </div>
    </template>
  </Suspense>
</template>
