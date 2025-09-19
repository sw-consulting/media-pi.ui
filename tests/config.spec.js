// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi backend

import { describe, it, expect } from 'vitest'
import { config } from '@/helpers/config.js'

describe('config helpers', () => {
  it('exports a config object with all configuration values', () => {
    expect(config).toHaveProperty('apiUrl')
    expect(config).toHaveProperty('enableLog')
  })
})

