/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Calm, neutral palette (warm surfaces + muted slate accent)
        white: '#FBFAF7',
        'pc-blue': '#4F6D7A',
        'pc-dark': '#3F5862',
        'pc-light': '#F4F3EF',
        gray: {
          50: '#F7F6F2',
          100: '#F0EEE9',
          200: '#E5E2DC',
          300: '#D5D2CB',
          400: '#B8B5AE',
          500: '#8E8B84',
          600: '#6F6C66',
          700: '#52504B',
          800: '#353431',
          900: '#1F1E1C',
          950: '#12110F'
        }
      },
      boxShadow: {
        md: '0 2px 10px rgba(17, 24, 39, 0.06)',
        lg: '0 10px 28px rgba(17, 24, 39, 0.08)',
        xl: '0 18px 48px rgba(17, 24, 39, 0.10)'
      }
    },
  },
  plugins: [],
}
