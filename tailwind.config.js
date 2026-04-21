/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Gobena Brand Palette
        brew: {
          50:  '#fdf8f2',
          100: '#f7edd9',
          200: '#eed9b3',
          300: '#e0bd83',
          400: '#d09a52',
          500: '#b87d36',
          600: '#9a632a',
          700: '#7d4e22',
          800: '#5e3a1a',
          900: '#3d2410',
        },
        roast: {
          50:  '#f5f0eb',
          100: '#e8ddd1',
          200: '#d4bfa3',
          300: '#bc9b74',
          400: '#a67b50',
          500: '#8b5e35',
          600: '#6f4728',
          700: '#54341d',
          800: '#3a2314',
          900: '#20130b',
        },
        cream: {
          50:  '#fefcf8',
          100: '#fdf7ee',
          200: '#faeddb',
          300: '#f5deba',
          400: '#edc88a',
          500: '#e2ad58',
        },
        bark:  '#2c1a0e',
        latte: '#c8a97e',
        foam:  '#f9f4ee',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"DM Mono"', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        warm:  '0 4px 24px rgba(44, 26, 14, 0.08)',
        card:  '0 2px 12px rgba(44, 26, 14, 0.06)',
        lifted:'0 8px 32px rgba(44, 26, 14, 0.12)',
      },
    },
  },
  plugins: [],
}
