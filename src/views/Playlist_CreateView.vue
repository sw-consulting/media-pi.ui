// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import PlaylistsSettings from '@/components/Playlists_Settings.vue'
</script>

<template>
  <Suspense>
    <PlaylistsSettings :register="true" />
    <template #fallback>
      <div class="text-center m-5">
        <span class="spinner-border spinner-border-lg align-center"></span>
        <div class="mt-2">Подготовка формы создания плейлиста...</div>
      </div>
    </template>
  </Suspense>
</template>
