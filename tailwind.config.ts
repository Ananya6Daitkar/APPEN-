import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          blue:    '#3B82F6',
          emerald: '#10B981',
          violet:  '#8B5CF6',
          amber:   '#F59E0B',
          red:     '#EF4444',
        },
        glass: {
          bg:     'rgba(15, 23, 42, 0.7)',
          border: 'rgba(255, 255, 255, 0.08)',
        },
        surface: {
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

export default config
