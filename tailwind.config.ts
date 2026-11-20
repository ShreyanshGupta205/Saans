import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // WCAG 2.2 AA compliant contrast palette
        aqi: {
          good: {
            bg: '#14532d',
            text: '#f0fdf4',
            accent: '#22c55e',
            border: '#16a34a',
          },
          satisfactory: {
            bg: '#365314',
            text: '#f7fee7',
            accent: '#84cc16',
            border: '#65a30d',
          },
          moderate: {
            bg: '#713f12',
            text: '#fefce8',
            accent: '#eab308',
            border: '#ca8a04',
          },
          poor: {
            bg: '#7c2d12',
            text: '#fff7ed',
            accent: '#f97316',
            border: '#ea580c',
          },
          verypoor: {
            bg: '#7f1d1d',
            text: '#fef2f2',
            accent: '#ef4444',
            border: '#dc2626',
          },
          severe: {
            bg: '#450a0a',
            text: '#fef2f2',
            accent: '#b91c1c',
            border: '#991b1b',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
