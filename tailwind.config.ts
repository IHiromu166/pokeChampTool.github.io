import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b1020",
        surface: "#141a2f",
        border: "#22304d",
        accent: "#5aa9ff",
        good: "#4ade80",
        warn: "#facc15",
        bad: "#f87171",
      },
    },
  },
  plugins: [],
};

export default config;
