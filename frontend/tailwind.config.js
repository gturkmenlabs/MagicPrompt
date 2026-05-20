/**
 * NeoMagic Design System — shadcn-style Tailwind tokens.
 * CSS variables in styles.css remain the source of truth.
 */

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{tsx,ts,jsx,js}',
    './components/**/*.{tsx,ts,jsx,js}',
    './contexts/**/*.{tsx,ts}',
    './hooks/**/*.{tsx,ts}',
    './*.{tsx,ts,html}',
  ],
  theme: {
    extend: {
      colors: {
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        popover: 'var(--popover)',
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        muted: 'var(--muted)',
        destructive: 'var(--destructive)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: {
          DEFAULT: 'var(--background)',
          dark: 'var(--bg-base)',
          light: '#F7F8FA',
        },
        surface: {
          dark: 'var(--surface-1)',
          light: '#FFFFFF',
        },
        border: {
          DEFAULT: 'var(--border)',
          dark: 'var(--border-default)',
          light: 'rgba(24, 24, 27, 0.12)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          primary: 'var(--primary)',
          secondary: 'var(--accent-strong)',
          pink: '#F43F5E',
        },
        text: {
          primary: {
            dark: 'var(--text-primary)',
            light: '#18181B',
          },
          secondary: {
            dark: 'var(--text-secondary)',
            light: '#52525B',
          },
        },
        success: 'var(--success-500)',
        warning: 'var(--warning-500)',
        error: 'var(--danger-500)',
        info: 'var(--primary)',
        'neon-primary': 'var(--primary)',
        'neon-secondary': 'var(--accent-strong)',
        'cyber-black': 'var(--bg-base)',
        'cyber-dark': 'var(--surface-1)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'Menlo', 'monospace'],
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.8125rem',
        'base': '0.875rem',
        'md': '1rem',
        'lg': '1.125rem',
        'xl': '1.5rem',
        '2xl': '1.875rem',
        '3xl': '2.5rem',
        '4xl': '3.25rem',
        'hero': '4rem',
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-card)',
        '2xl': 'var(--radius-panel)',
        'full': '9999px',
      },
      boxShadow: {
        'premium-sm': 'var(--shadow-sm)',
        'premium-md': 'var(--shadow-md)',
        'premium-lg': 'var(--shadow-lg)',
        'premium-xl': 'var(--shadow-xl)',
        'glass-shadow': 'var(--shadow-panel)',
        'accent-glow': 'var(--shadow-accent)',
        'neon-glow': 'var(--shadow-accent)',
        'neon-glow-lg': 'var(--shadow-xl)',
        'neon-soft': 'var(--shadow-md)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'gradient-xy': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: 'var(--shadow-md)' },
          '50%':      { boxShadow: 'var(--shadow-accent)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateX(-10px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        cursorBlink: {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        scan: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        gridPulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '0.85' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
        'gradient-xy': 'gradient-xy 15s ease infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        fadeIn: 'fadeIn 0.3s ease forwards',
        blink: 'blink 1.5s ease-in-out infinite',
        cursorBlink: 'cursorBlink 1s step-end infinite',
        scan: 'scan 4s linear infinite',
        gridPulse: 'gridPulse 8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
