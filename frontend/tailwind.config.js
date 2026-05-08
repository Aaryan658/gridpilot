/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: '#0a0e1a',
        card: '#1e2d40',
        gridpilot: '#7c5cbf',
        firstflight: '#00d4aa',
      },
    },
  },
  plugins: [],
}
