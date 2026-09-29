import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class', // This specifically enables the toggle button to work
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;