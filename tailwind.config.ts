import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f1f5f9",
        surface: "#ffffff",
        border: "#e2e8f0",
        accent: "#2563eb",
        good: "#16a34a",
        warn: "#d97706",
        bad: "#dc2626",
      },
    },
  },
  plugins: [],
};

export default config;
