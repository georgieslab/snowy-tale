/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'updock': ['Updock', 'cursive'],
      },
      keyframes: {
        heartbeat: {
          '0%': { transform: 'scale(1)' },
          '14%': { transform: 'scale(1.3)' },
          '28%': { transform: 'scale(1)' },
          '42%': { transform: 'scale(1.3)' },
          '70%': { transform: 'scale(1)' },
        }
      },
      animation: {
        heartbeat: 'heartbeat 2s infinite'
      },
      rotate: {
        'y-180': 'rotateY(180deg)',
        'y-0': 'rotateY(0deg)',
      },
      transformStyle: {
        'preserve-3d': 'preserve-3d',
      },
      backfaceVisibility: {
        'hidden': 'hidden',
      },
      scale: {
        '-100': '-1',
      },
    },
  },
  plugins: [],
}