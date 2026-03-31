/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      colors: {
        surface: {
          950: '#0b0818',
          900: '#110e28',
          800: '#1e1b3a',
          850: '#181530',
        },
      },
      boxShadow: {
        'glow-violet': '0 0 20px rgba(124,58,237,0.35)',
        'glow-cyan': '0 0 20px rgba(6,182,212,0.3)',
        'glow-green': '0 0 20px rgba(5,150,105,0.3)',
        'card': '0 4px 24px rgba(0,0,0,0.25)',
      },
      animation: {
        'fade-in': 'fadeIn 0.35s cubic-bezier(.16,1,.3,1)',
        'slide-in': 'slideIn 0.35s cubic-bezier(.16,1,.3,1)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: 0, transform: 'translateX(20px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
