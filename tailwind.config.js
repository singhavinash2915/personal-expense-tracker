/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      colors: {
        // New emerald/gold palette
        emerald: {
          DEFAULT: '#34d399',
          50:  '#ecfdf5',
          100: '#d1fae5',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        gold: {
          DEFAULT: '#fbbf24',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          DEFAULT: '#fca5a5',
        },
        base: {
          DEFAULT: '#03110d',
          surface: '#050a08',
        },
      },
      boxShadow: {
        'glow-emerald': '0 8px 32px -12px rgba(52,211,153,0.35)',
        'glow-gold':    '0 12px 30px -8px rgba(251,191,36,0.5)',
        'card':          '0 4px 24px rgba(0,0,0,0.15)',
      },
      animation: {
        'fade-in':   'fadeIn 0.35s cubic-bezier(.16,1,.3,1)',
        'slide-in':  'slideIn 0.35s cubic-bezier(.16,1,.3,1)',
        'sheet-up':  'sheetUp 0.25s ease forwards',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: 0, transform: 'translateX(20px)' },
          to:   { opacity: 1, transform: 'translateX(0)' },
        },
        sheetUp: {
          from: { transform: 'translateY(100%)' },
          to:   { transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
