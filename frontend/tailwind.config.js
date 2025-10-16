/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        space: {
          900: '#0B1021',
          800: '#0D132B', 
          700: '#111827',
        },
        aurora: {
          violet: '#7C3AED',
          fuchsia: '#EC4899',
          emerald: '#10B981',
        }
      },
      borderRadius: {
        'neo': '20px',
        'neo-lg': '24px'
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'neo': '0 20px 50px -12px rgba(0, 0, 0, 0.5)',
        'aurora': '0 0 40px rgba(124, 58, 237, 0.3)'
      }
    },
  },
  plugins: [],
}
