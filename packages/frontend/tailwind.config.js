/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        violet: {
          DEFAULT: '#7C3AED',
          dark: '#5B21B6',
          light: '#A78BFA',
        },
        teal: {
          DEFAULT: '#14B8A6',
        },
        coral: {
          DEFAULT: '#FF6B6B',
        },
        sunny: {
          DEFAULT: '#FCD34D',
        },
        cream: {
          DEFAULT: '#FFF9F5',
        },
        'purple-deep': '#1F1235',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'soft-lg': '0 4px 16px rgba(0, 0, 0, 0.08)',
        '3d-sm': '0 4px 0 0 rgba(0, 0, 0, 0.1), 0 8px 16px rgba(0, 0, 0, 0.1)',
        '3d-md': '0 6px 0 0 #5B21B6, 0 12px 24px rgba(124, 58, 237, 0.3)',
        '3d-lg': '0 8px 0 0 #5B21B6, 0 16px 32px rgba(124, 58, 237, 0.4)',
        'card-soft': '0 10px 30px rgba(124, 58, 237, 0.1), inset 0 -4px 8px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'bounce-gentle': 'bounce 2s ease-in-out infinite',
        'bounce-in': 'bounceIn 0.6s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'sparkle-float': 'sparkleFloat 3s ease-in-out infinite',
        'float-shape': 'floatShape 20s ease-in-out infinite',
        'rocket-float': 'rocketFloat 2s ease-in-out infinite',
        'badge-pulse': 'badgePulse 2s ease-in-out infinite',
      },
      keyframes: {
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        sparkleFloat: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)', opacity: '0.6' },
          '50%': { transform: 'translateY(-10px) rotate(180deg)', opacity: '1' },
        },
        floatShape: {
          '0%, 100%': { transform: 'translate(0, 0) rotate(0deg)' },
          '25%': { transform: 'translate(50px, -50px) rotate(90deg)' },
          '50%': { transform: 'translate(0, -100px) rotate(180deg)' },
          '75%': { transform: 'translate(-50px, -50px) rotate(270deg)' },
        },
        rocketFloat: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        badgePulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
}
