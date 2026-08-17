import { useEffect, useState } from 'react'
import { useSettings } from '@/app/providers/SettingsProvider'

export interface ChartTheme {
  success: string
  danger: string
  running: string
  accent: string
  categorical: [string, string, string]
  grid: string
  axis: string
  surface: string
  ink: string
  inkMuted: string
  line: string
}

function readVar(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return value || fallback
}

function read(): ChartTheme {
  const rgb = (name: string, fallback: string) => {
    const raw = readVar(name, '')
    return raw ? `rgb(${raw})` : fallback
  }
  return {
    success: rgb('--c-success', '#34c77b'),
    danger: rgb('--c-danger', '#f45760'),
    running: rgb('--c-running', '#38bdf8'),
    accent: rgb('--c-accent', '#c7f53d'),
    categorical: [
      readVar('--chart-1', '#d9569b'),
      readVar('--chart-2', '#22a0de'),
      readVar('--chart-3', '#77a20c'),
    ],
    grid: readVar('--chart-grid', 'rgb(39 43 50)'),
    axis: readVar('--chart-axis', 'rgb(106 114 126)'),
    surface: readVar('--chart-surface', 'rgb(18 20 24)'),
    ink: rgb('--c-ink', '#e8ebef'),
    inkMuted: rgb('--c-ink-muted', '#98a0ab'),
    line: rgb('--c-line', '#272b32'),
  }
}

/**
 * Recharts needs literal colour strings, so design tokens are resolved
 * from the document once per theme change rather than passed as `var()`.
 */
export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useSettings()
  const [theme, setTheme] = useState<ChartTheme>(read)

  useEffect(() => {
    // Wait a frame so the `data-theme` swap has been painted.
    const raf = requestAnimationFrame(() => setTheme(read()))
    return () => cancelAnimationFrame(raf)
  }, [resolvedTheme])

  return theme
}
