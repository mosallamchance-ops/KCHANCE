/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eaf4ef",
          100: "#cfe6da",
          500: "#0e6b4a",
          600: "#0a4f37",
          700: "#083f2c"
        }
      },
      fontFamily: {
        display: ["Lalezar", "Tajawal", "sans-serif"],
        body: ["Tajawal", "Tahoma", "sans-serif"]
      }
    }
  },
  plugins: []
};
