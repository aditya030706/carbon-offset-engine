/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0f1419',
        'card-bg': '#1a1f2e',
        'primary-blue': '#4c9aff',
        'accent-purple': '#7c3aed',
      }
    },
  },
  plugins: [],
}