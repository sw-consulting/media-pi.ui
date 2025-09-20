// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect } from 'vitest'
import { drawer, toggleDrawer, hideDrawer } from '@/helpers/drawer.js'

describe('drawer helpers', () => {
  it('toggleDrawer flips drawer value', () => {
    drawer.value = false
    toggleDrawer()
    expect(drawer.value).toBe(true)
  })

  it('hideDrawer sets value to false', () => {
    drawer.value = true
    hideDrawer()
    expect(drawer.value).toBe(false)
  })
})

