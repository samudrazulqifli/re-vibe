/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1A73E8",
        secondary: "#34A853",
        accent: "#FBBC04",
        destructive: "#EA4335",
        background: "#F8F9FA",
      },
      borderRadius: {
        'card': '16px',
        'button': '12px',
        'chip': '24px',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'bounce-slow': 'bounce 3s infinite',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
