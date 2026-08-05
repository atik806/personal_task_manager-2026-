/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./App.tsx"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "#F6F7FB",
        surface: "#FFFFFF",
        ink: "#1C1E26",
        "ink-secondary": "#6B7080",
        accent: "#4C5FD5",
        "accent-soft": "#E7EAFB",
        danger: "#FF6B5B",
        "danger-soft": "#FDEAE7",
        success: "#34B27B",
        "success-soft": "#E4F4EC",
        line: "#E4E6EF",
        // dark palette
        "canvas-dark": "#14161C",
        "surface-dark": "#1B1E28",
        "ink-dark": "#F1F2F6",
        "ink-secondary-dark": "#A0A5B4",
        "accent-dark": "#6E7EF0",
        "accent-soft-dark": "#262C4D",
        "danger-dark": "#FF7A6B",
        "danger-soft-dark": "#3A2624",
        "success-dark": "#3ECB8E",
        "success-soft-dark": "#1E332B",
        "line-dark": "#262A35",
      },
      fontFamily: {
        display: ["SpaceGrotesk_500Medium"],
        "display-bold": ["SpaceGrotesk_700Bold"],
        body: ["Inter_400Regular"],
        "body-medium": ["Inter_500Medium"],
        "body-semibold": ["Inter_600SemiBold"],
        mono: ["JetBrainsMono_400Regular"],
        "mono-medium": ["JetBrainsMono_500Medium"],
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "14px" }],
      },
    },
  },
  plugins: [],
};
