// Copyright (c) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// This file is a part of Media Pi frontend application

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
  faMinus,
  faTrashCan,
  faUserPlus,
  faList,
  faCheck,
  faCheckDouble,
  faXmark,
  faCity,
  faBuildingUser,
  faLayerGroup,
  faObjectGroup,
  faTv,
  faPlugCircleCheck,
  faPlugCircleXmark,
  faPlugCirclePlus,
  faPlugCircleMinus
} from '@fortawesome/free-solid-svg-icons'

  import {
  faCircle,
  faCircleQuestion,
} from '@fortawesome/free-regular-svg-icons'

library.add(
  faDownload, 
  faEye, 
  faEyeSlash, 
  faHand, 
  faPen, 
  faPlay, 
  faPlus, 
  faMinus,
  faTrashCan, 
  faUserPlus, 
  faList, 
  faCheck,
  faCheckDouble, 
  faXmark,
  faCircle,
  faCircleQuestion,
  faCity,
  faBuildingUser,
  faLayerGroup,
  faObjectGroup,
  faTv,
  faPlugCircleCheck,
  faPlugCircleXmark,
  faPlugCirclePlus,
  faPlugCircleMinus
)

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
