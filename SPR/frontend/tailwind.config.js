/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        whatsapp: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#25D366',
          600: '#21bd5a',
        },
      },
    },
  },
  plugins: [],
} 