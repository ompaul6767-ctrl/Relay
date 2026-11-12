/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0a1624',
          900: '#12263F',
          800: '#1a3556',
          700: '#264a75',
          600: '#356399',
          100: '#e5edf7',
          50: '#f1f5fa',
        },
        teal: {
          900: '#06423e',
          700: '#09635e',
          600: '#0E8A83',
          500: '#12a89f',
          400: '#22c7bc',
          100: '#d7f4f2',
          50: '#edf9f8',
        },
        status: {
          verified: {
            bg: '#ecfdf5',
            text: '#047857',
            border: '#a7f3d0',
            darkBg: '#064e3b',
            darkText: '#6ee7b7',
          },
          attested: {
            bg: '#eff6ff',
            text: '#1d4ed8',
            border: '#bfdbfe',
            darkBg: '#1e3a8a',
            darkText: '#93c5fd',
          },
          inferred: {
            bg: '#fffbeb',
            text: '#b45309',
            border: '#fde68a',
            darkBg: '#78350f',
            darkText: '#fcd34d',
          },
          conflicting: {
            bg: '#fef2f2',
            text: '#b91c1c',
            border: '#fecaca',
            darkBg: '#7f1d1d',
            darkText: '#fca5a5',
          },
          missing: {
            bg: '#f5f3ff',
            text: '#6d28d9',
            border: '#ddd6fe',
            darkBg: '#4c1d95',
            darkText: '#c4b5fd',
          },
          restricted: {
            bg: '#f3f4f6',
            text: '#4b5563',
            border: '#e5e7eb',
            darkBg: '#374151',
            darkText: '#9ca3af',
          },
          rejected: {
            bg: '#faf5ff',
            text: '#9333ea',
            border: '#f3e8ff',
            darkBg: '#581c87',
            darkText: '#d8b4fe',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'lg': '10px',
        'xl': '12px',
      }
    },
  },
  plugins: [],
}
