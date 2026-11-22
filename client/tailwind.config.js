/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FFF8F3',
        blush: { 50: '#FFF1F3', 100: '#FDE2E7', 200: '#F9C5D0', 300: '#F2A2B4', 400: '#E77C96', 500: '#D85A7B' },
        wine: { 500: '#9E2F4F', 600: '#862541', 700: '#6E1D36', 800: '#55162A', 900: '#3D0F1E' },
        gold: { 300: '#EBCB97', 400: '#DDB273', 500: '#C9974F', 700: '#7A5018' },
        ink: '#3A1C27',
      },
      fontFamily: {
        // Titres : serif chaleureux ; texte : sans sobre ; lettre : serif de lecture ; signature : écriture manuscrite.
        display: ['"Young Serif"', 'Georgia', 'serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Noto Color Emoji"'],
        letter: ['"Literata Variable"', 'Georgia', 'serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Noto Color Emoji"'],
        script: ['"La Belle Aurore"', 'cursive'],
        sans: ['"Instrument Sans Variable"', 'system-ui', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Noto Color Emoji"'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(110, 29, 54, 0.25)',
        glow: '0 0 0 4px rgba(231, 124, 150, 0.22), 0 12px 32px -8px rgba(158, 47, 79, 0.45)',
      },
      backgroundImage: {
        'love-gradient': 'linear-gradient(135deg, #FFF1F3 0%, #FFF8F3 45%, #FDE2E7 100%)',
        'wine-gradient': 'linear-gradient(135deg, #9E2F4F 0%, #6E1D36 60%, #3D0F1E 100%)',
      },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '15%': { transform: 'scale(1.18)' },
          '30%': { transform: 'scale(1)' },
          '45%': { transform: 'scale(1.12)' },
        },
      },
      animation: {
        shimmer: 'shimmer 3s linear infinite',
        heartbeat: 'heartbeat 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
