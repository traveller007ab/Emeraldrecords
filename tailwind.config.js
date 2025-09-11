/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'spin-slow': 'spin 6s linear infinite',
        'fade-in': 'fade-in 0.5s ease-out forwards',
      },
      backgroundImage: {
        'main-gradient': 'radial-gradient(circle at top, var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [],
}