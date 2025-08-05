// Copyright (c) 2025 sw.consulting
// Licensed under the MIT License.
// This file is a part of Mediapi frontend application

import { createApp } from 'vue'
import { createPinia } from 'pinia'

// ------------ fontawesome --------------
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import {
  faDownload,
  faEye,
  faEyeSlash,
  faHand,
  faPen,
  faPlay,
  faPlus,
  faTrashCan,
  faUserPlus,
  faList
} from '@fortawesome/free-solid-svg-icons'

library.add(faDownload, faEye, faEyeSlash, faHand, faPen, faPlay, faPlus, faTrashCan, faUserPlus, faList)

import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import VuetifyUseDialog from 'vuetify-use-dialog'
//import { aliases, fa } from 'vuetify/iconsets/fa'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'

import App from '@/App.vue'
import router from '@/router'

import { useAuthStore } from '@/stores/auth.store.js'

export function initializeApp() {
  const vuetify = createVuetify({
    breakpoint: {
      mobileBreakpoint: 'xl' // This is the breakpoint for mobile devices
    },
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: {
        mdi
        //      fa,
      }
    }
  })

  // Create the app instance but don't mount it yet
  const app = createApp(App)
    .component('font-awesome-icon', FontAwesomeIcon)
    .use(createPinia())
    .use(router)
    .use(vuetify)
    .use(VuetifyUseDialog)

  const queryString = window.location.search
  const urlParams = new URLSearchParams(queryString)

  var jwt = null
  var tgt = null

  if (urlParams.has('recover')) {
    jwt = urlParams.get('recover')
    tgt = 'recover'
  } else if (urlParams.has('register')) {
    jwt = urlParams.get('register')
    tgt = 'register'
  }

  if (jwt) {
    const authStore = useAuthStore()
    authStore.re_jwt = jwt
    authStore.re_tgt = tgt
  }

  // Mount the app now that config is already loaded
  app.mount('#app')
}
