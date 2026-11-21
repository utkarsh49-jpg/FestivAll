/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fest: {
          dark: '#0a071b',
          card: 'rgba(26, 21, 63, 0.65)',
          border: 'rgba(255, 255, 255, 0.12)',
          purple: '#8b5cf6',
          pink: '#ec4899',
          blue: '#3b82f6',
          cyan: '#06b6d4',
          orange: '#f97316',
          yellow: '#facc15',
        }
      },
      backgroundImage: {
        'fest-gradient': 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f97316 100%)',
        'fest-glow': 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.25) 0%, rgba(236, 72, 153, 0.15) 35%, transparent 70%)',
        'stage-glow': 'radial-gradient(ellipse at bottom, rgba(168, 85, 247, 0.35) 0%, rgba(6, 182, 212, 0.2) 50%, transparent 80%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
