/** @type {import('tailwindcss').Config} */
import daisyui from "daisyui"
import tailwindcssMotion from "tailwindcss-motion"; 

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [daisyui,tailwindcssMotion,],
  daisyui: {
    themes: ["light", "business"], // Include any DaisyUI themes you want.
  },
}