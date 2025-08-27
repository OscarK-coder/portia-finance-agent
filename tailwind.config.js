/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}", // make sure Tailwind scans your src folder
  ],
  theme: {
    extend: {
      keyframes: {
        loading: {
          "0%": { transform: "translateX(-350px)", opacity: "0" },
          "35%, 65%": { transform: "translateX(0px)", opacity: "1" },
          "100%": { transform: "translateX(350px)", opacity: "0" },
        },
      },
      animation: {
        loading: "loading 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
