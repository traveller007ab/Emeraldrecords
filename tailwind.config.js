/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 6s linear infinite',
      },
      backgroundImage: {
        'main-gradient': 'radial-gradient(circle at top, var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [],
}