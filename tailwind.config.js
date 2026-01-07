/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pc-blue': '#0066cc',
        'pc-dark': '#004c99',
        'pc-light': '#e6f2ff',
      }
    },
  },
  plugins: [],
}
