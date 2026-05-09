import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#020915",
          900: "#06101f",
          850: "#081827",
          800: "#0c2034"
        },
        telgo: {
          cyan: "#05d9ff",
          blue: "#178bff",
          violet: "#7c3cff",
          green: "#22e052",
          amber: "#ff9f0a",
          red: "#ff4242"
        }
      },
      boxShadow: {
        glow: "0 0 36px rgba(5, 217, 255, 0.18)",
        card: "0 24px 60px rgba(0, 0, 0, 0.32)"
      },
      backgroundImage: {
        "industrial-radial":
          "radial-gradient(circle at 20% 0%, rgba(5, 217, 255, 0.14), transparent 32%), radial-gradient(circle at 85% 18%, rgba(124, 60, 255, 0.12), transparent 24%), linear-gradient(180deg, #020915 0%, #04101e 45%, #020915 100%)",
        "panel-glow":
          "linear-gradient(135deg, rgba(12, 32, 52, 0.92), rgba(4, 16, 30, 0.76))"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
