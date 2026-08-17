import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'
import { StorageKeys } from '@/lib/storage'
import type { AppSettings, Role, ThemeMode } from '@/types/workspace'

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  reduceMotion: false,
  showMinimap: true,
  snapToGrid: false,
  autoSave: true,
  executionSpeed: 'normal',
  emailDigest: true,
  notifyOnFailure: true,
  notifyOnPublish: true,
  notifyOnComment: true,
  defaultEnvironment: 'production',
  simulatedRole: null,
}

interface SettingsContextValue {
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => void
  theme: ThemeMode
  resolvedTheme: 'dark' | 'light'
  setTheme: (mode: ThemeMode) => void
  /** True when either the OS or the user asked for calmer motion. */
  reduceMotion: boolean
  role: Role
  can: (action: 'edit' | 'publish' | 'manage') => boolean
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function resolve(mode: ThemeMode): 'dark' | 'light' {
  if (mode !== 'system') return mode
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useLocalStorage<AppSettings>(
    StorageKeys.settings,
    DEFAULT_SETTINGS,
  )
  // The pre-paint script in index.html owns this key too.
  const [theme, setThemeRaw] = useLocalStorage<ThemeMode>(StorageKeys.theme, 'dark')
  const systemReduceMotion = usePrefersReducedMotion()

  const resolvedTheme = useMemo(() => resolve(theme), [theme])

  useEffect(() => {
    const apply = () => {
      const next = resolve(theme)
      document.documentElement.dataset.theme = next
      document.documentElement.style.colorScheme = next
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', next === 'dark' ? '#0A0B0D' : '#FAFAFB')
    }
    apply()
    if (theme !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: light)')
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [theme])

  const update = useCallback(
    (patch: Partial<AppSettings>) => {
      setSettings((current) => ({ ...current, ...patch }))
      if (patch.theme) setThemeRaw(patch.theme)
    },
    [setSettings, setThemeRaw],
  )

  const setTheme = useCallback(
    (mode: ThemeMode) => {
      setThemeRaw(mode)
      setSettings((current) => ({ ...current, theme: mode }))
    },
    [setSettings, setThemeRaw],
  )

  const role: Role = settings.simulatedRole ?? 'admin'

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings: { ...settings, theme },
      update,
      theme,
      resolvedTheme,
      setTheme,
      reduceMotion: systemReduceMotion || settings.reduceMotion,
      role,
      can: (action) => {
        if (role === 'admin') return true
        if (role === 'editor') return action !== 'manage'
        return false
      },
    }),
    [settings, theme, resolvedTheme, update, setTheme, systemReduceMotion, role],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>')
  return ctx
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const { theme, resolvedTheme, setTheme } = useSettings()
  return { theme, resolvedTheme, setTheme }
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePermissions() {
  const { role, can } = useSettings()
  return { role, can, readOnly: role === 'viewer' }
}
