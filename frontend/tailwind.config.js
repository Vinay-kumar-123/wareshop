/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#171717', 50: '#F5F5F5', 100: '#E5E5E5', 200: '#D4D4D4', 300: '#A3A3A3', 400: '#737373', 500: '#525252', 600: '#404040', 700: '#262626', 800: '#171717', 900: '#0A0A0A',
        },
        accent: {
          DEFAULT: '#F36B21', 50: '#FFF0E7', 100: '#FFDEC8', 200: '#FFC096', 300: '#FF9D60', 400: '#F9823F', 500: '#F36B21', 600: '#D95513', 700: '#B8410D', 800: '#96350F', 900: '#792D10',
        },
        background: '#F7F8FA',
        surface: '#FFFFFF',
        'text-primary': '#171717', 'text-muted': '#666666', border: '#E5E7EB',
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(20,45,78,0.12)',
        'focus': '0 0 0 3px rgba(19,168,158,0.25)',
      },
    },
  },
  plugins: [],
}
