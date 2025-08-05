// Copyright (c) 2025 sw.consulting
// Licensed under the MIT License.
// This file is a part of Mediapi frontend application

import { ref } from 'vue'

export const drawer = ref(null)

export function toggleDrawer() {
  drawer.value = !drawer.value
}

export function hideDrawer() {
  drawer.value = false
}
