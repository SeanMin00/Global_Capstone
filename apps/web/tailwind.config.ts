import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#082032",
        mist: "#E8F1F2",
        tide: "#00A6A6",
        sand: "#F6C177",
        coral: "#F07167",
      },
      boxShadow: {
        card: "0 12px 30px rgba(8, 32, 50, 0.14)",
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top left, rgba(0,166,166,0.18), transparent 32%), radial-gradient(circle at bottom right, rgba(240,113,103,0.18), transparent 28%)",
      },
    },
  },
  plugins: [],
};

export default config;

