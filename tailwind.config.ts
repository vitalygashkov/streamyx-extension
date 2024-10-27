import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './extension/entrypoints/popup/**/*.{js,ts,jsx,tsx,css,md,mdx,html,json,scss}',
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
