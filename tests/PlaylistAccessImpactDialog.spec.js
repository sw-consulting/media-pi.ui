// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi frontend application

import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PlaylistAccessImpactDialog from '@/components/PlaylistAccessImpactDialog.vue'
import { isPlaylistAccessImpactError, normalizePlaylistAccessImpact } from '@/helpers/playlist.access.impact.js'

vi.mock('@/components/ModalWindow.vue', () => ({
  default: {
    name: 'ModalWindow',
    props: ['modelValue', 'title'],
    emits: ['confirm', 'cancel', 'update:modelValue'],
    template: '<div v-if="modelValue" data-test="modal-window"><slot /><slot name="actions" /></div>'
  }
}))

describe('playlist access impact helpers', () => {
  it('detects backend playlist impact conflicts', () => {
    expect(isPlaylistAccessImpactError({
      status: 409,
      data: { affectedPlaylists: [] }
    })).toBe(true)

    expect(isPlaylistAccessImpactError({ status: 409, data: { msg: 'conflict' } })).toBe(false)
  })

  it('normalizes missing playlist fields', () => {
    const result = normalizePlaylistAccessImpact({
      affectedPlaylists: [{ playlistId: 5, accountId: 2, removedItemCount: 3 }]
    })

    expect(result.affectedPlaylists[0]).toEqual(expect.objectContaining({
      title: 'Плейлист #5',
      accountName: 'Лицевой счёт 2',
      removedItemCount: 3
    }))
  })

  it('normalizes zero removedItemCount using fallback to 0', () => {
    const result = normalizePlaylistAccessImpact({
      affectedPlaylists: [{ playlistId: 7, accountId: 3, removedItemCount: 0 }]
    })

    expect(result.affectedPlaylists[0].removedItemCount).toBe(0)
    expect(result.affectedPlaylists[0].affectedVideoCount).toBe(0)
  })
})

const defaultImpact = {
  affectedPlaylistCount: 1,
  affectedItemCount: 2,
  affectedVideoCount: 1,
  affectedPlaylists: [
    { playlistId: 1, title: 'Morning', filename: 'morning.m3u', accountId: 9, accountName: 'Cafe', removedItemCount: 2 }
  ]
}

const mountDialog = (props = {}) => mount(PlaylistAccessImpactDialog, {
  props: {
    modelValue: true,
    saving: false,
    impact: defaultImpact,
    ...props
  },
  global: {
    stubs: {
      'v-btn': { template: '<button v-bind="$attrs"><slot /></button>' }
    }
  }
})

describe('PlaylistAccessImpactDialog.vue', () => {
  it('displays affected playlist list before force cleanup', () => {
    const wrapper = mountDialog({
      impact: {
        affectedPlaylistCount: 2,
        affectedItemCount: 4,
        affectedVideoCount: 3,
        affectedPlaylists: [
          { playlistId: 1, title: 'Morning', filename: 'morning.m3u', accountId: 9, accountName: 'Cafe', removedItemCount: 2 },
          { playlistId: 2, title: 'Evening', filename: 'evening.m3u', accountId: 9, accountName: 'Cafe', removedItemCount: 2 }
        ]
      }
    })

    const list = wrapper.find('[data-test="playlist-impact-list"]')
    expect(list.text()).toContain('Cafe / Morning')
    expect(list.text()).toContain('morning.m3u')
    expect(list.text()).toContain('Cafe / Evening')
  })

  it('emits confirm when ModalWindow fires confirm and not saving', async () => {
    const wrapper = mountDialog({ saving: false })

    await wrapper.findComponent({ name: 'ModalWindow' }).vm.$emit('confirm')

    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('does not emit confirm when ModalWindow fires confirm while saving', async () => {
    const wrapper = mountDialog({ saving: true })

    await wrapper.findComponent({ name: 'ModalWindow' }).vm.$emit('confirm')

    expect(wrapper.emitted('confirm')).toBeFalsy()
  })

  it('emits cancel and closes dialog when cancel button is clicked and not saving', async () => {
    const wrapper = mountDialog({ saving: false })

    await wrapper.find('[data-test="cancel-playlist-impact-button"]').trigger('click')

    expect(wrapper.emitted('cancel')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('does not emit cancel when cancel button is clicked while saving', async () => {
    const wrapper = mountDialog({ saving: true })

    await wrapper.find('[data-test="cancel-playlist-impact-button"]').trigger('click')

    expect(wrapper.emitted('cancel')).toBeFalsy()
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('does not emit cancel when ModalWindow fires cancel while saving', async () => {
    const wrapper = mountDialog({ saving: true })

    await wrapper.findComponent({ name: 'ModalWindow' }).vm.$emit('cancel')

    expect(wrapper.emitted('cancel')).toBeFalsy()
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('forwards update:modelValue from ModalWindow', async () => {
    const wrapper = mountDialog({ saving: false })

    await wrapper.findComponent({ name: 'ModalWindow' }).vm.$emit('update:modelValue', false)

    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('normalizes impact with null values', () => {
    const wrapper = mountDialog({ impact: null })

    expect(wrapper.find('[data-test="playlist-impact-list"]').exists()).toBe(true)
  })

  it('emits confirm when confirm button is clicked and not saving', async () => {
    const wrapper = mountDialog({ saving: false })

    await wrapper.find('[data-test="confirm-playlist-impact-button"]').trigger('click')

    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('uses fallback text for playlist without filename', () => {
    const wrapper = mountDialog({
      impact: {
        affectedPlaylistCount: 1,
        affectedItemCount: 1,
        affectedVideoCount: 1,
        affectedPlaylists: [
          { playlistId: 42, accountId: 3, removedItemCount: 1 }
        ]
      }
    })

    const list = wrapper.find('[data-test="playlist-impact-list"]')
    expect(list.text()).toContain('Плейлист #42')
    expect(list.text()).toContain('Лицевой счёт 3')
    expect(list.text()).toContain('ID 42')
    expect(list.text()).not.toContain('id=42')
  })
})
