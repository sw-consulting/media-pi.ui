// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { Field } from 'vee-validate'

import PlaylistsSettings from '@/components/Playlists_Settings.vue'

const playlistsStore = {
  playlist: ref(null),
  loading: ref(false),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn()
}

const videosStore = {
  videos: ref([]),
  getAllByAccount: vi.fn()
}

const alertState = ref(null)
const alertStore = {
  alert: alertState,
  error: vi.fn(),
  clear: vi.fn()
}

vi.mock('@/stores/playlists.store.js', () => ({
  usePlaylistsStore: () => playlistsStore
}))

vi.mock('@/stores/videos.store.js', () => ({
  useVideosStore: () => videosStore
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => alertStore
}))

vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: { name: 'font-awesome-icon', render: () => null }
}))

vi.mock('@/components/FieldArrayWithButtons.vue', () => ({
  default: {
    name: 'FieldArrayWithButtons',
    props: ['name', 'label', 'options', 'hasError'],
    components: { Field },
    template: `
      <div class="field-array-stub">
        <label>{{ label }}</label>
        <Field :name="name + '[0]'" as="select" data-test="video-select">
          <option value="">Выберите видеофайл</option>
          <option v-for="option in options" :key="option.value" :value="option.value">
            {{ option.text }}
          </option>
        </Field>
      </div>
    `
  }
}))

describe('Playlists_Settings.vue', () => {
  beforeEach(() => {
    playlistsStore.playlist.value = null
    playlistsStore.loading.value = false
    playlistsStore.getById.mockReset()
    playlistsStore.create.mockReset()
    playlistsStore.update.mockReset()
    videosStore.getAllByAccount.mockReset()
    videosStore.videos.value = []
    alertStore.error.mockReset()
    alertStore.clear.mockReset()
    alertState.value = null
  })

  const mountComponent = async (props) => {
    const wrapper = mount(PlaylistsSettings, {
      props,
      global: {
        stubs: {
          'v-dialog': { template: '<div><slot /></div>' },
          ActionButton: {
            name: 'ActionButton',
            props: ['item', 'icon', 'tooltipText'],
            template: '<button class="action-btn"><slot /></button>'
          }
        }
      }
    })
    await flushPromises()
    return wrapper
  }

  it('submits new playlist data', async () => {
    videosStore.getAllByAccount.mockResolvedValue([{ id: 10, title: 'Video 10' }])
    playlistsStore.create.mockResolvedValue({ id: 3 })

    const wrapper = await mountComponent({ register: true, accountId: 5 })

    await wrapper.vm.onSubmit({ title: '  Новый плейлист  ', videoIds: ['10'] }, { setSubmitting: vi.fn() })
    await flushPromises()

    expect(playlistsStore.create).toHaveBeenCalledWith({
      accountId: 5,
      title: 'Новый плейлист',
      videoIds: [10]
    })

    const emitted = wrapper.emitted('saved')
    expect(emitted).toBeTruthy()
    expect(emitted[0][0]).toEqual({ accountId: 5 })
  })

  it('loads existing playlist and updates it', async () => {
    playlistsStore.getById.mockImplementation(async () => {
      const playlist = { id: 7, title: 'Тестовый', accountId: 9, videoIds: [4] }
      playlistsStore.playlist.value = playlist
      return playlist
    })
    videosStore.getAllByAccount.mockResolvedValue([
      { id: 4, title: 'Video 4' },
      { id: 6, title: 'Video 6' }
    ])
    playlistsStore.update.mockResolvedValue({})

    const wrapper = await mountComponent({ register: false, id: 7 })
    await flushPromises()

    expect(playlistsStore.getById).toHaveBeenCalledWith(7)
    expect(videosStore.getAllByAccount).toHaveBeenCalledWith(9)

    const titleInput = wrapper.find('input#title')
    expect(titleInput.element.value).toBe('Тестовый')

    await wrapper.vm.onSubmit({ title: 'Изменённый', videoIds: ['6'] }, { setSubmitting: vi.fn() })
    await flushPromises()

    expect(playlistsStore.update).toHaveBeenCalledWith(7, {
      title: 'Изменённый',
      videoIds: [6]
    })

    const emitted = wrapper.emitted('saved')
    expect(emitted[0][0]).toEqual({ accountId: 9 })
  })
})
