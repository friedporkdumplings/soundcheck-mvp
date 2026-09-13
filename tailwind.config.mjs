/** @type {import('tailwindcss').Config} */
const config = {
  theme: {
    extend: {
      colors: {
        paper: "#ffffff",
        sky: "#ccecff",
        mist: "#eef8ff",
        navy: "#193a68",
        ink: "#183153",
      },
      boxShadow: {
        "soft-brutal": "4px 4px 0 #193a68",
        "soft-brutal-sm": "3px 3px 0 #193a68",
      },
    },
  },
};

export default config;
