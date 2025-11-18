// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

<script setup>
import PlaylistsTree from '@/components/Playlists_Tree.vue'
</script>

<template>
  <Suspense>
    <PlaylistsTree />
    <template #fallback>
      <div class="text-center m-5">
        <span class="spinner-border spinner-border-lg align-center"></span>
        <div class="mt-2">Загрузка плейлистов...</div>
      </div>
    </template>
  </Suspense>
</template>
