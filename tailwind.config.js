/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core Design System Tokens
        "primary": "#adc6ff",
        "primary-container": "#004395",
        "on-primary": "#003d88",
        "background": "#060e20",
        "surface": "#060e20",
        "surface-container-lowest": "#000000",
        "surface-container-low": "#06122d",
        "surface-container": "#05183c",
        "surface-container-high": "#031d4b",
        "on-surface": "#dee5ff",
        "on-surface-variant": "#91aaeb",
        "outline": "#5b74b1",
        "outline-variant": "#2b4680",
        "error": "#ee7d77",
        "error-container": "#7f2927",
        "secondary": "#909fb5",
        "secondary-container": "#2e3c4f",
        
        // Shadcn UI Semantic Mapping
        // These map Shadcn components dire