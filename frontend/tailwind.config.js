/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enables easy toggling for your dark mode specs
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#208080', // Teal
          hover: '#1a7070',
          active: '#0f5a5a',
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#2a2a26',
        },
        background: {
          DEFAULT: '#f5f5f3',
          dark: '#1a1a18',
        },
        text: {
          primary: '#134252',
          secondary: '#627c81',
          light: '#f5f5f3', 
        },
        border: {
          DEFAULT: '#e0e0d8',
          dark: 'rgba(255, 255, 255, 0.1)',
        },
        status: {
          success: '#20a080',
          warning: '#d97706',
          error: '#dc2626',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Courier New', 'Monaco', 'monospace'],
      },
      spacing: {
        // Enforcing the 8px baseline grid
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '6': '24px',
        '8': '32px',
      },
      borderRadius: {
        'md': '8px',
        'lg': '12px',
      }
    },
  },
  plugins: [],
}