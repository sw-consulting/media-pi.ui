<script setup>

// Copyright (c) 2025 sw.consulting
// Licensed under the MIT License.
// This file is a part of Mediapi frontend application

import { watch } from 'vue'
import { useAuthStore } from '@/stores/auth.store.js'
import { storeToRefs } from 'pinia'


const authStore = useAuthStore()
const { registers_per_page, registers_search, registers_sort_by, registers_page } = storeToRefs(authStore)

// Watch for changes in pagination, sorting, or search
watch([registers_page, registers_per_page, registers_sort_by, registers_search], () => {
  loadRegisters()
}, { immediate: true, deep: true })


</script>

<template>
  <div class="settings table-2">
    <h1 class="orange">Реестры</h1>
    <hr class="hr" />

    <v-card>
    </v-card>
    </div>
</template>
