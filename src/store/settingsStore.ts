import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Settings, KeyboardShortcuts } from '@/types'
import { DEFAULT_SETTINGS, DEFAULT_SHORTCUTS } from '@/types'
import { storageSync } from '@/lib/chrome-api'

const SETTINGS_KEY = 'settings'
const SHORTCUTS_KEY = 'keyboard_shortcuts'

interface SettingsState {
  settings: Settings
  shortcuts: KeyboardShortcuts
  isLoading: boolean
  error: string | null
}

interface SettingsActions {
  fetchSettings: () => Promise<void>
  updateSettings: (updates: Partial<Settings>) => Promise<void>
  resetSettings: () => Promise<void>
  updateShortcuts: (updates: Partial<KeyboardShortcuts>) => Promise<void>
  resetShortcuts: () => Promise<void>
  getEffectiveTheme: () => 'light' | 'dark'
  applyTheme: () => void
}

type SettingsStore = SettingsState & SettingsActions

export const useSettingsStore = create<SettingsStore>()(
  subscribeWithSelector((set, get) => ({
    settings: DEFAULT_SETTINGS,
    shortcuts: DEFAULT_SHORTCUTS,
    isLoading: false,
    error: null,

    fetchSettings: async () => {
      set({ isLoading: true, error: null })
      try {
        const result = await storageSync.get<{
          [SETTINGS_KEY]?: Settings
          [SHORTCUTS_KEY]?: KeyboardShortcuts
        }>([SETTINGS_KEY, SHORTCUTS_KEY])

        set({
          settings: { ...DEFAULT_SETTINGS, ...result[SETTINGS_KEY] },
          shortcuts: { ...DEFAULT_SHORTCUTS, ...result[SHORTCUTS_KEY] },
          isLoading: false,
        })

        // Apply theme after fetching settings
        get().applyTheme()
      } catch (error) {
        set({ error: (error as Error).message, isLoading: false })
      }
    },

    updateSettings: async (updates) => {
      try {
        const newSettings = { ...get().settings, ...updates }
        await storageSync.set({ [SETTINGS_KEY]: newSettings })
        set({ settings: newSettings })

        // Re-apply theme if theme setting changed
        if ('theme' in updates) {
          get().applyTheme()
        }
      } catch (error) {
        set({ error: (error as Error).message })
      }
    },

    resetSettings: async () => {
      try {
        await storageSync.set({ [SETTINGS_KEY]: DEFAULT_SETTINGS })
        set({ settings: DEFAULT_SETTINGS })
        get().applyTheme()
      } catch (error) {
        set({ error: (error as Error).message })
      }
    },

    updateShortcuts: async (updates) => {
      try {
        const newShortcuts = { ...get().shortcuts, ...updates }
        await storageSync.set({ [SHORTCUTS_KEY]: newShortcuts })
        set({ shortcuts: newShortcuts })
      } catch (error) {
        set({ error: (error as Error).message })
      }
    },

    resetShortcuts: async () => {
      try {
        await storageSync.set({ [SHORTCUTS_KEY]: DEFAULT_SHORTCUTS })
        set({ shortcuts: DEFAULT_SHORTCUTS })
      } catch (error) {
        set({ error: (error as Error).message })
      }
    },

    getEffectiveTheme: () => {
      const { theme } = get().settings
      if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      return theme
    },

    applyTheme: () => {
      const effectiveTheme = get().getEffectiveTheme()
      if (effectiveTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    },
  }))
)

// Subscribe to system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const store = useSettingsStore.getState()
    if (store.settings.theme === 'system') {
      store.applyTheme()
    }
  })
}
