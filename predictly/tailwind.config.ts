import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef9f4',
          100: '#d6f1e5',
          200: '#b0e4cd',
          300: '#7dd0af',
          400: '#48b58d',
          500: '#279973',
          600: '#1a7a5c',
          700: '#16624b',
          800: '#144e3d',
          900: '#124132',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
  future: {
    hoverOnlyWhenSupported: true,
  },
};

export default config;
