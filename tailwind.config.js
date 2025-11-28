/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f9fd',
          100: '#ccf3fb',
          200: '#99e7f7',
          300: '#66dbf3',
          400: '#33cfef',
          500: '#04BDD9',
          600: '#0397ae',
          700: '#027182',
          800: '#024c57',
          900: '#01262b',
          DEFAULT: '#04BDD9',
          hover: '#0397ae',
        },
        secondary: {
          50: '#fafee6',
          100: '#f5fdcc',
          200: '#ebfb99',
          300: '#e1f966',
          400: '#d7f733',
          500: '#BCD918',
          600: '#96ae13',
          700: '#71820e',
          800: '#4b570a',
          900: '#262b05',
          DEFAULT: '#BCD918',
          hover: '#96ae13',
        },
      },
      fontFamily: {
        mono: ['Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
