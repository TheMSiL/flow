/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--c-surface) / <alpha-value>)',
          raised: 'rgb(var(--c-surface-raised) / <alpha-value>)',
          sunken: 'rgb(var(--c-surface-sunken) / <alpha-value>)',
          overlay: 'rgb(var(--c-surface-overlay) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--c-line) / <alpha-value>)',
          strong: 'rgb(var(--c-line-strong) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--c-ink) / <alpha-value>)',
          muted: 'rgb(var(--c-ink-muted) / <alpha-value>)',
          faint: 'rgb(var(--c-ink-faint) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--c-accent) / <alpha-value>)',
          soft: 'rgb(var(--c-accent-soft) / <alpha-value>)',
          ink: 'rgb(var(--c-accent-ink) / <alpha-value>)',
        },
        cat: {
          trigger: 'rgb(var(--c-cat-trigger) / <alpha-value>)',
          action: 'rgb(var(--c-cat-action) / <alpha-value>)',
          condition: 'rgb(var(--c-cat-condition) / <alpha-value>)',
          ai: 'rgb(var(--c-cat-ai) / <alpha-value>)',
          integration: 'rgb(var(--c-cat-integration) / <alpha-value>)',
          utility: 'rgb(var(--c-cat-utility) / <alpha-value>)',
        },
        state: {
          success: 'rgb(var(--c-success) / <alpha-value>)',
          danger: 'rgb(var(--c-danger) / <alpha-value>)',
          warning: 'rgb(var(--c-warning) / <alpha-value>)',
          running: 'rgb(var(--c-running) / <alpha-value>)',
          idle: 'rgb(var(--c-idle) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['InterVariable', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'JetBrains Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
      },
      borderRadius: {
        xs: 'var(--r-xs)',
        sm: 'var(--r-sm)',
        DEFAULT: 'var(--r-md)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
        '2xl': 'var(--r-2xl)',
      },
      boxShadow: {
        xs: 'var(--sh-xs)',
        sm: 'var(--sh-sm)',
        md: 'var(--sh-md)',
        lg: 'var(--sh-lg)',
        xl: 'var(--sh-xl)',
        node: 'var(--sh-node)',
        'node-hover': 'var(--sh-node-hover)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        spring: 'var(--ease-spring)',
      },
      zIndex: {
        canvas: '10',
        panel: '30',
        header: '40',
        drawer: '50',
        modal: '60',
        toast: '70',
        palette: '80',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgb(var(--c-running) / 0.5)' },
          '70%': { boxShadow: '0 0 0 8px rgb(var(--c-running) / 0)' },
          '100%': { boxShadow: '0 0 0 0 rgb(var(--c-running) / 0)' },
        },
        'dash-flow': {
          to: { strokeDashoffset: '-16' },
        },
        spin: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        'fade-in': 'fade-in 160ms var(--ease-out) both',
        'slide-up': 'slide-up 200ms var(--ease-out) both',
        shimmer: 'shimmer 1.6s infinite',
        'pulse-ring': 'pulse-ring 1.4s ease-out infinite',
        'dash-flow': 'dash-flow 500ms linear infinite',
      },
    },
  },
  plugins: [],
}
