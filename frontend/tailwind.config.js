/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Score field
        ink: {
          DEFAULT: '#07080a',
          2: '#0e1015',
          3: '#161922',
          4: '#222633',
        },
        // Marks
        chalk: {
          DEFAULT: '#e8e6df',
          2: '#9a9a94',
          3: '#61615c',
        },
        // Source identities — see DESIGN.md
        sig: {
          green: '#3ff5a8',
          magenta: '#ff3d8b',
          amber: '#ffb03a',
          cyan: '#49d4ff',
          violet: '#a77bff',
        },
      },
      fontFamily: {
        sans: ['Archivo', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        stave: '0.14em',
      },
    },
  },
  plugins: [],
}
