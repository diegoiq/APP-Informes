/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        crr: {
          dark: '#0f172a',
          navy: '#1e293b',
          surface: '#334155',
          primary: '#0284c7',
          primaryHover: '#0369a1',
          accent: '#10b981',
          danger: '#ef4444',
          warning: '#f59e0b',
          border: '#e2e8f0',
          bg: '#f8fafc'
        }
      }
    },
  },
  plugins: [],
}
