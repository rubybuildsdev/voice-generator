/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: "#050506",
          glass: "rgba(22, 22, 26, 0.72)",
          card: "rgba(28, 28, 34, 0.65)",
          border: "rgba(255, 255, 255, 0.12)",
          accent: "#5fb2f2",
          glow: "rgba(95, 178, 242, 0.42)",
          amber: "#f49d70",
          lime: "#c4f26a",
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
