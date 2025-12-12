/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        dark: {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a24',
          600: '#24242e',
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'eq-1': 'eq 0.8s ease-in-out infinite',
        'eq-2': 'eq 0.6s ease-in-out infinite 0.1s',
        'eq-3': 'eq 0.7s ease-in-out infinite 0.2s',
        'eq-4': 'eq 0.5s ease-in-out infinite 0.15s',
        'eq-5': 'eq 0.9s ease-in-out infinite 0.25s',
        'pulse-slow': 'pulse 4s ease-in-out infinite',
        'scroll': 'scroll 30s linear infinite',
      },
      keyframes: {
        eq: {
          '0%, 100%': { height: '20%' },
          '50%': { height: '100%' },
        },
        scroll: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      }
    },
  },
  plugins: [],
}
