import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
        },
      },
      animation: {
        "stamp-in": "stampIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        "spin-slow": "spin 3s linear infinite",
      },
      keyframes: {
        stampIn: {
          "0%": { transform: "scale(0) rotate(-30deg)", opacity: "0" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
