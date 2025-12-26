// Copyright (c) 2025 sw.consulting
// This file is a part of Media Pi  frontend application

import { library } from '@fortawesome/fontawesome-svg-core'
import { faCheckDouble, faXmark } from '@fortawesome/free-solid-svg-icons'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import DeviceGroupSettings from '@/components/DeviceGroup_Settings.vue'

library.add(faCheckDouble, faXmark)

let authStore
const deviceGroupsStore = {
  group: null,
  loading: false,
  error: null,
  getById: vi.fn(),
  add: vi.fn(),
  update: vi.fn()
}
const alertStore = {
  alert: null,
  error: vi.fn(),
  success: vi.fn(),
  clear: vi.fn()
}
const playlistsStore = {
  playlists: ref([]),
  loading: ref(false),
  error: ref(null),
  getAllByAccount: vi.fn()
}

vi.mock('pinia', async () => {
  const actual = await vi.importActual('pinia')
  return { ...actual, storeToRefs: (store) => store }
})

vi.mock('@/router', () => {
  const mockRouter = {
    go: vi.fn()
  }
  return {
    default: mockRouter,
    $router: mockRouter
  }
})

vi.mock('@/stores/auth.store.js', () => ({
  useAuthStore: () => authStore
}))

vi.mock('@/stores/device.groups.store.js', () => ({
  useDeviceGroupsStore: () => deviceGroupsStore
}))

vi.mock('@/stores/alert.store.js', () => ({
  useAlertStore: () => alertStore
}))

vi.mock('@/stores/playlists.store.js', () => ({
  usePlaylistsStore: () => playlistsStore
}))

vi.mock('@/helpers/default.route.js', () => ({
  redirectToDefaultRoute: vi.fn()
}))

const mountSettings = (props = {}) => mount({
  template: '<Suspense><DeviceGroupSettings v-bind="$attrs" /></Suspense>',
  components: { DeviceGroupSettings },
  inheritAttrs: false
}, {
  attrs: {
    register: false,
    id: 1,
    accountId: 1,
    ...props
  },
  global: {
    stubs: {
      'v-card': { template: '<div><slot /></div>' },
      'v-data-table': {
        props: ['items'],
        template: `
          <div class="data-table">
            <div v-for="item in items" :key="item.id" class="data-table-row">
              <slot name="item.upload" :item="item" />
              <slot name="item.play" :item="item" />
              <slot name="item.totalFileSizeBytes" :item="item" />
              <slot name="item.totalDurationSeconds" :item="item" />
            </div>
          </div>
        `
      },
      Form: {
        template: `
          <div data-testid="form" @submit="onSubmit">
            <slot :errors="errors" :isSubmitting="isSubmitting" />
          </div>
        `,
        props: ['validation-schema', 'initial-values'],
        emits: ['submit'],
        data() {
          return {
            errors: props.showValidationError ? { name: 'Необходимо указать имя' } : {},
            isSubmitting: props.isSubmitting || false
          }
        },
        methods: {
          onSubmit() {
            this.$emit('submit', { name: props.submitValue || 'Test Group' })
          }
        }
      },
      Field: { 
        template: '<input data-testid="name-field" />', 
        props: ['name', 'type', 'disabled', 'class', 'placeholder']
      }
    },
    components: {
      'font-awesome-icon': FontAwesomeIcon
    },
    mocks: {
      $router: {
        go: vi.fn()
      }
    }
  }
})

describe('DeviceGroup_Settings.vue', () => {
  beforeEach(() => {
    authStore = {
      isAdministrator: true,
      isManager: false
    }
    deviceGroupsStore.group = null
    deviceGroupsStore.loading = false
    deviceGroupsStore.error = null
    deviceGroupsStore.getById = vi.fn().mockResolvedValue()
    deviceGroupsStore.add = vi.fn().mockResolvedValue()
    deviceGroupsStore.update = vi.fn().mockResolvedValue()
    playlistsStore.playlists.value = []
    playlistsStore.loading.value = false
    playlistsStore.error.value = null
    playlistsStore.getAllByAccount = vi.fn().mockResolvedValue()
    alertStore.alert = null
    vi.clearAllMocks()
  })

  it('renders form for creating new group', async () => {
    const wrapper = mountSettings({ register: true, accountId: 5 })
    await flushPromises()

    expect(wrapper.find('[data-testid="form"]').exists()).toBe(true)
    expect(deviceGroupsStore.getById).not.toHaveBeenCalled()
    expect(playlistsStore.getAllByAccount).toHaveBeenCalledWith(5)
  })

  it('loads group data when editing', async () => {
    deviceGroupsStore.group = {
      id: 1,
      name: 'Test Group',
      accountId: 12
    }

    const wrapper = mountSettings({ register: false, id: 1 })
    await flushPromises()

    expect(deviceGroupsStore.getById).toHaveBeenCalledWith(1)
    expect(wrapper.find('[data-testid="form"]').exists()).toBe(true)
    expect(playlistsStore.getAllByAccount).toHaveBeenCalledWith(12)
  })

  it('handles form submission for creating group', async () => {
    const wrapper = mountSettings({ register: true, accountId: 5 })
    await flushPromises()

    const form = wrapper.find('[data-testid="form"]')
    await form.trigger('submit')
    await flushPromises()

    expect(deviceGroupsStore.add).toHaveBeenCalledWith({
      name: 'Test Group',
      accountId: 5,
      playlists: []
    })
  })

  it('handles form submission for updating group', async () => {
    deviceGroupsStore.group = {
      id: 1,
      name: 'Existing Group'
    }

    const wrapper = mountSettings({ register: false, id: 1 })
    await flushPromises()

    const form = wrapper.find('[data-testid="form"]')
    await form.trigger('submit')
    await flushPromises()

    expect(deviceGroupsStore.update).toHaveBeenCalledWith(1, {
      name: 'Test Group',
      playlists: []
    })
  })

  it('initializes playlist selections when editing', async () => {
    deviceGroupsStore.group = {
      id: 1,
      name: 'Existing Group',
      accountId: 12,
      playLists: [
        { playlistId: 10, play: false },
        { playlistId: 11, play: true }
      ]
    }
    playlistsStore.playlists.value = [
      { id: 10, totalFileSizeBytes: 0, totalDurationSeconds: 0 },
      { id: 11, totalFileSizeBytes: 0, totalDurationSeconds: 0 }
    ]

    const wrapper = mountSettings({ register: false, id: 1 })
    await flushPromises()

    const uploadCheckbox = wrapper.find('[data-test="playlist-upload-10"]')
    const uploadCheckbox2 = wrapper.find('[data-test="playlist-upload-11"]')
    const playRadio = wrapper.find('[data-test="playlist-play-11"]')

    expect(uploadCheckbox.element.checked).toBe(true)
    expect(uploadCheckbox2.element.checked).toBe(true)
    expect(playRadio.element.checked).toBe(true)
  })

  it('does not reapply initial playlist selection after playlists are reloaded', async () => {
    // Setup initial group data with playlist selections
    deviceGroupsStore.group = {
      id: 1,
      name: 'Existing Group',
      accountId: 12,
      playLists: [
        { playlistId: 10, play: false },
        { playlistId: 11, play: true }
      ]
    }
    
    playlistsStore.playlists.value = [
      { id: 10, totalFileSizeBytes: 0, totalDurationSeconds: 0 },
      { id: 11, totalFileSizeBytes: 0, totalDurationSeconds: 0 }
    ]

    const wrapper = mountSettings({ register: false, id: 1 })
    await flushPromises()

    // Verify initial playlist selections were applied
    expect(wrapper.find('[data-test="playlist-upload-10"]').element.checked).toBe(true)
    expect(wrapper.find('[data-test="playlist-upload-11"]').element.checked).toBe(true)

    // User unchecks a playlist
    await wrapper.find('[data-test="playlist-upload-10"]').setValue(false)
    await flushPromises()

    // Verify the change took effect
    expect(wrapper.find('[data-test="playlist-upload-10"]').element.checked).toBe(false)
    
    // Simulate playlists being reloaded by calling getAllByAccount again
    // This tests that pendingPlaylistSelection was cleared and won't reapply
    playlistsStore.getAllByAccount.mockResolvedValue()
    playlistsStore.playlists.value = [
      { id: 10, totalFileSizeBytes: 0, totalDurationSeconds: 0 },
      { id: 11, totalFileSizeBytes: 0, totalDurationSeconds: 0 },
      { id: 12, totalFileSizeBytes: 0, totalDurationSeconds: 0 }
    ]
    
    // Trigger watcher by unmounting and remounting (simulates account reload scenario)
    wrapper.unmount()
    
    // Set up new mount without playLists to ensure fresh state
    deviceGroupsStore.group = {
      id: 1,
      name: 'Existing Group',
      accountId: 12,
      playLists: [] // No playlists this time
    }
    
    const wrapper2 = mountSettings({ register: false, id: 1 })
    await flushPromises()

    // Since the group has no playlists now, and pendingPlaylistSelection should have been
    // cleared after first application, all checkboxes should be unchecked
    expect(wrapper2.find('[data-test="playlist-upload-10"]').element.checked).toBe(false)
    expect(wrapper2.find('[data-test="playlist-upload-11"]').element.checked).toBe(false)
  })

  it('submits selected playlists with play flag', async () => {
    playlistsStore.playlists.value = [
      { id: 1, totalFileSizeBytes: 0, totalDurationSeconds: 0 },
      { id: 2, totalFileSizeBytes: 0, totalDurationSeconds: 0 }
    ]

    const wrapper = mountSettings({ register: true, accountId: 5 })
    await flushPromises()

    await wrapper.find('[data-test="playlist-upload-1"]').setValue(true)
    await wrapper.find('[data-test="playlist-upload-2"]').setValue(true)
    await wrapper.find('[data-test="playlist-play-2"]').trigger('click')

    const form = wrapper.find('[data-testid="form"]')
    await form.trigger('submit')
    await flushPromises()

    expect(deviceGroupsStore.add).toHaveBeenCalledWith(expect.objectContaining({
      playlists: [
        { playlistId: 1, play: false },
        { playlistId: 2, play: true }
      ]
    }))
  })

  it('handles group not found error', async () => {
    deviceGroupsStore.group = null

    mountSettings({ register: false, id: 999 })
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Ошибка загрузки группы устройств: Группа устройств с ID 999 не найдена')
  })

  it('handles create error', async () => {
    deviceGroupsStore.add = vi.fn().mockRejectedValue({ message: 'Group name already exists' })

    const wrapper = mountSettings({ register: true })
    await flushPromises()

    const form = wrapper.find('[data-testid="form"]')
    await form.trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Ошибка при создании группы устройств: Group name already exists')
  })

  it('handles 401/403 errors on initial load by redirecting', async () => {
    const { redirectToDefaultRoute } = await import('@/helpers/default.route.js')
    deviceGroupsStore.getById = vi.fn().mockRejectedValue({ status: 401 })

    mountSettings({ register: false, id: 1 })
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })

  it('handles 404 error on initial load', async () => {
    deviceGroupsStore.getById = vi.fn().mockRejectedValue({ status: 404 })

    mountSettings({ register: false, id: 1 })
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Группа устройств с ID 1 не найдена')
  })

  it('handles generic error on initial load', async () => {
    deviceGroupsStore.getById = vi.fn().mockRejectedValue({ message: 'Network error' })

    mountSettings({ register: false, id: 1 })
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Ошибка загрузки группы устройств: Network error')
  })

  it('handles 401/403 errors on form submission by redirecting', async () => {
    const { redirectToDefaultRoute } = await import('@/helpers/default.route.js')
    deviceGroupsStore.add = vi.fn().mockRejectedValue({ status: 403 })

    const wrapper = mountSettings({ register: true, accountId: 5 })
    await flushPromises()

    const form = wrapper.find('[data-testid="form"]')
    await form.trigger('submit')
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })

  it('handles 404 error on form submission', async () => {
    deviceGroupsStore.update = vi.fn().mockRejectedValue({ status: 404 })

    const wrapper = mountSettings({ register: false, id: 1 })
    await flushPromises()

    const form = wrapper.find('[data-testid="form"]')
    await form.trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Группа устройств с ID 1 не найдена')
  })

  it('handles 409 conflict error on form submission', async () => {
    deviceGroupsStore.add = vi.fn().mockRejectedValue({ status: 409 })

    const wrapper = mountSettings({ register: true, accountId: 5 })
    await flushPromises()

    const form = wrapper.find('[data-testid="form"]')
    await form.trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Группа устройств с таким названием уже существует')
  })

  it('handles 422 validation error on form submission', async () => {
    deviceGroupsStore.update = vi.fn().mockRejectedValue({ status: 422 })

    const wrapper = mountSettings({ register: false, id: 1 })
    await flushPromises()

    const form = wrapper.find('[data-testid="form"]')
    await form.trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Проверьте корректность введённых данных')
  })

  it('handles generic error on update submission', async () => {
    deviceGroupsStore.update = vi.fn().mockRejectedValue({ message: 'Server error' })

    const wrapper = mountSettings({ register: false, id: 1 })
    await flushPromises()

    const form = wrapper.find('[data-testid="form"]')
    await form.trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Ошибка при обновлении группы устройств: Server error')
  })

  it('trims whitespace from group name on submission', async () => {
    const wrapper = mountSettings({ register: true, accountId: 5, submitValue: '  Test Group  ' })
    await flushPromises()

    const form = wrapper.find('[data-testid="form"]')
    await form.trigger('submit')
    await flushPromises()

    expect(deviceGroupsStore.add).toHaveBeenCalledWith({
      name: 'Test Group',
      accountId: 5,
      playlists: []
    })
  })

  it('navigates back after successful submission', async () => {
    const router = await import('@/router')
    deviceGroupsStore.add = vi.fn().mockResolvedValue()

    const wrapper = mountSettings({ register: true, accountId: 5 })
    await flushPromises()

    const form = wrapper.find('[data-testid="form"]')
    await form.trigger('submit')
    await flushPromises()

    expect(router.default.go).toHaveBeenCalledWith(-1)
  })

  it('displays correct heading for create mode', async () => {
    const wrapper = mountSettings({ register: true, accountId: 5 })
    await flushPromises()

    expect(wrapper.text()).toContain('Новая группа устройств')
  })

  it('displays correct heading for edit mode', async () => {
    deviceGroupsStore.group = { id: 1, name: 'Test Group' }
    const wrapper = mountSettings({ register: false, id: 1 })
    await flushPromises()

    expect(wrapper.text()).toContain('Настройки группы устройств')
  })

  it('displays correct button text for create mode', async () => {
    const wrapper = mountSettings({ register: true, accountId: 5 })
    await flushPromises()

    expect(wrapper.text()).toContain('Создать')
  })

  it('displays correct button text for edit mode', async () => {
    deviceGroupsStore.group = { id: 1, name: 'Test Group' }
    const wrapper = mountSettings({ register: false, id: 1 })
    await flushPromises()

    expect(wrapper.text()).toContain('Сохранить')
  })

  it('shows component in edit mode for existing group', async () => {
    deviceGroupsStore.group = { id: 1, name: 'Existing Group' }
    
    const wrapper = mountSettings({ register: false, id: 1 })
    await flushPromises()
    
    expect(deviceGroupsStore.getById).toHaveBeenCalledWith(1)
    expect(wrapper.find('[data-testid="form"]').exists()).toBe(true)
  })

  it('displays saving spinner during form submission', async () => {
    deviceGroupsStore.loading = true
    
    const wrapper = mountSettings({ register: true, accountId: 5 })
    await flushPromises()
    
    expect(wrapper.text()).toContain('Сохранение...')
    expect(wrapper.find('.spinner-border-lg').exists()).toBe(true)
  })

  it('handles successive form submissions correctly', async () => {
    deviceGroupsStore.add = vi.fn()
      .mockRejectedValueOnce({ message: 'First error' })
      .mockResolvedValueOnce()

    const wrapper = mountSettings({ register: true, accountId: 5 })
    await flushPromises()

    // First submission with error
    const form = wrapper.find('[data-testid="form"]')
    await form.trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Ошибка при создании группы устройств: First error')

    // Second submission should succeed
    alertStore.error.mockClear()
    await form.trigger('submit')
    await flushPromises()

    expect(alertStore.error).not.toHaveBeenCalled()
  })

  it('handles cancel button click', async () => {
    const wrapper = mountSettings({ register: true, accountId: 5 })
    await flushPromises()

    const cancelButton = wrapper.find('button.secondary')
    await cancelButton.trigger('click')

    expect(wrapper.vm.$router.go).toHaveBeenCalledWith(-1)
  })

  it('loads group with empty name if name is missing', async () => {
    deviceGroupsStore.group = { id: 1 } // no name property

    mountSettings({ register: false, id: 1 })
    await flushPromises()

    expect(deviceGroupsStore.getById).toHaveBeenCalledWith(1)
    // Should handle missing name gracefully
  })

  it('handles error without message property', async () => {
    deviceGroupsStore.add = vi.fn().mockRejectedValue('String error')

    const wrapper = mountSettings({ register: true, accountId: 5 })
    await flushPromises()

    const form = wrapper.find('[data-testid="form"]')
    await form.trigger('submit')
    await flushPromises()

    expect(alertStore.error).toHaveBeenCalledWith('Ошибка при создании группы устройств: String error')
  })

  it('displays alert when present', async () => {
    alertStore.alert = { type: 'error', message: 'Test alert message' }

    const wrapper = mountSettings({ register: true, accountId: 5 })
    await flushPromises()

    expect(wrapper.text()).toContain('Test alert message')
    
    const closeButton = wrapper.find('.btn.btn-link.close')
    expect(closeButton.exists()).toBe(true)
    
    await closeButton.trigger('click')
    expect(alertStore.clear).toHaveBeenCalled()
  })

  it('displays validation error for name field', async () => {
    const wrapper = mountSettings({ register: true, accountId: 5, showValidationError: true })
    await flushPromises()

    expect(wrapper.text()).toContain('Необходимо указать имя')
    expect(wrapper.find('.alert-danger').exists()).toBe(true)
  })

  it('displays field with correct properties', async () => {
    const wrapper = mountSettings({ register: true, accountId: 5, isSubmitting: true })
    await flushPromises()

    const field = wrapper.find('[data-testid="name-field"]')
    expect(field.exists()).toBe(true)
  })

  it('shows submitting state on form and button', async () => {
    const wrapper = mountSettings({ register: true, accountId: 5, isSubmitting: true })
    await flushPromises()

    expect(wrapper.find('.spinner-border-sm').exists()).toBe(true)
  })

  it('formats playlist duration and size', async () => {
    playlistsStore.playlists.value = [
      { id: 10, totalFileSizeBytes: 1024, totalDurationSeconds: 65 }
    ]

    const wrapper = mountSettings({ register: true, accountId: 5 })
    await flushPromises()

    expect(wrapper.text()).toContain('1.0 КБ')
    expect(wrapper.text()).toContain('1:05')
  })

  it('toggles upload and play selections', async () => {
    playlistsStore.playlists.value = [
      { id: 1, totalFileSizeBytes: 0, totalDurationSeconds: 0 },
      { id: 2, totalFileSizeBytes: 0, totalDurationSeconds: 0 }
    ]

    const wrapper = mountSettings({ register: true, accountId: 5 })
    await flushPromises()

    const uploadCheckbox = wrapper.find('[data-test="playlist-upload-1"]')
    await uploadCheckbox.setValue(true)
    expect(uploadCheckbox.element.checked).toBe(true)
    await uploadCheckbox.setValue(false)
    expect(uploadCheckbox.element.checked).toBe(false)

    // Enable playlist 2 for upload so its play radio becomes active
    const uploadCheckbox2 = wrapper.find('[data-test="playlist-upload-2"]')
    await uploadCheckbox2.setValue(true)

    const getPlayRadio = () => wrapper.find('[data-test="playlist-play-2"]')

    await getPlayRadio().trigger('click')
    await flushPromises()
    expect(getPlayRadio().element.checked).toBe(true)

    await getPlayRadio().trigger('click')
    await flushPromises()
    expect(getPlayRadio().element.checked).toBe(false)
  })

  it('handles error status 403 during initial load', async () => {
    const { redirectToDefaultRoute } = await import('@/helpers/default.route.js')
    deviceGroupsStore.getById = vi.fn().mockRejectedValue({ status: 403 })

    mountSettings({ register: false, id: 1 })
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })

  it('handles error status 401 during form submission', async () => {
    const { redirectToDefaultRoute } = await import('@/helpers/default.route.js')
    deviceGroupsStore.update = vi.fn().mockRejectedValue({ status: 401 })

    const wrapper = mountSettings({ register: false, id: 1 })
    await flushPromises()

    const form = wrapper.find('[data-testid="form"]')
    await form.trigger('submit')
    await flushPromises()

    expect(redirectToDefaultRoute).toHaveBeenCalled()
  })
})
