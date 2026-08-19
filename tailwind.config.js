/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f3f0ff",
          100: "#e5deff",
          500: "#6f4bf2",
          600: "#5a36e0",
          700: "#4527b8"
        }
      }
    }
  },
  plugins: []
};
