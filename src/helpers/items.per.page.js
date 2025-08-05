// Copyright (c) 2025 sw.consulting
// Licensed under the MIT License.
// This file is a part of Mediapi frontend application

// I had to do it because did not work items-per-page-all="Все"
// It is not a property :(
// https://github.com/vuetifyjs/vuetify/blob/master/packages/vuetify/src/labs/VDataTable/VDataTableFooter.tsx
// примеры https://github.com/vuetifyjs/vuetify/blob/master/packages/docs/src/examples/v-data-table/headers-multiple.vue

export const itemsPerPageOptions = [
  { value: 10, title: '10' },
  { value: 25, title: '25' },
  { value: 50, title: '50' },
  { value: -1, title: 'Все' }
]
