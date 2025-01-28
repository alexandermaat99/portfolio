/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poetsen: ["var(--font-poetsen-one)"],
        "space-grotesk": ["var(--font-space-grotesk)"],
      },
    },
  },
  plugins: [],
};
