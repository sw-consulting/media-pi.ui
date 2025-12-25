// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PlaylistSettings from '@/components/Playlist_Settings.vue'

const route = useRoute()

const accountId = computed(() => {
  const raw = Array.isArray(route.query.accountId) ? route.query.accountId[0] : route.query.accountId
  if (!raw) return undefined
  const parsed = parseInt(raw, 10)
  return Number.isNaN(parsed) ? undefined : parsed
})
</script>

<template>
  <Suspense>
    <PlaylistSettings :register="true" :account-id="accountId" />
    <template #fallback>
      <div class="text-center m-5">
        <span class="spinner-border spinner-border-lg align-center"></span>
        <div class="mt-2">Подготовка формы создания плейлиста...</div>
      </div>
    </template>
  </Suspense>
</template>
