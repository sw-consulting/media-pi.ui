/* @vitest-environment jsdom */
// Copyright (c) 2026 sw.consulting
// This file is a part of Media Pi frontend application

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import ScreenshotViewDialog from '@/components/Screenshot_View_Dialog.vue'

vi.mock('@sw-consulting/tooling.ui.kit', () => ({
  ActionButton: {
    name: 'ActionButton',
    props: ['item', 'icon', 'tooltipText', 'disabled'],
    emits: ['click'],
    template: '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
  }
}))

const globalStubs = {
  'v-dialog': {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<div v-if="modelValue" class="v-dialog-stub"><slot /></div>'
  },
  'v-card': { template: '<div class="v-card-stub"><slot /></div>' }
}

describe('Screenshot_View_Dialog.vue', () => {
  it('renders screenshot preview with device and date title', () => {
    const wrapper = mount(ScreenshotViewDialog, {
      props: {
        modelValue: true,
        screenshot: { filename: 'shot.jpg', objectUrl: 'blob:shot' },
        deviceTitle: 'Device 7',
        takenAt: '2026-04-15T10:00:00Z'
      },
      global: { stubs: globalStubs }
    })

    expect(wrapper.text()).toContain('Фотография устройства Device 7')
    expect(wrapper.text()).toContain('15.04.2026')
    expect(wrapper.get('.screenshot-dialog-image').attributes('src')).toBe('blob:shot')
    expect(wrapper.get('.screenshot-dialog-image').attributes('alt')).toBe('shot.jpg')
  })

  it('emits close when close button is clicked', async () => {
    const wrapper = mount(ScreenshotViewDialog, {
      props: {
        modelValue: true,
        screenshot: { filename: 'shot.jpg', objectUrl: 'blob:shot' }
      },
      global: { stubs: globalStubs }
    })

    await wrapper.find('[data-test="close-screenshot-dialog"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })
})
