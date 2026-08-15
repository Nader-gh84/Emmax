import type { Config } from "tailwindcss";

/**
 * Colors resolve through CSS variables (see globals.css).
 * Defaults on :root keep the legacy palette; `.emax-theme` opts into
 * the marketing (dusk) palette for a scoped pilot.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "var(--emax-navy)",
        accent: "var(--emax-accent)",
        surface: "var(--emax-surface)",
        soft: "var(--emax-text-soft)",
        mute: "var(--emax-text-mute)",
        glass: "var(--emax-glass-brd)",
        "blue-bright": "var(--emax-blue-bright)",
        "blue-pale": "var(--emax-blue-pale)",
      },
      fontFamily: {
        sans: ["var(--font-app)", "DM Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        field: "11px",
      },
      keyframes: {
        waveform: {
          "0%, 100%": { transform: "scaleY(0.4)" },
          "50%": { transform: "scaleY(1)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        waveform: "waveform 0.8s ease-in-out infinite",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "pulse-dot": "pulse-dot 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
