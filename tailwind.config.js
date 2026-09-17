/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base Institutional Palette (Prompt 6.5)
        institutional: {
          bg: '#F8FAF9',
          surface: '#FFFFFF',
          subtle: '#F1F5F3',
          border: '#DDE5E1',
          50: '#F8FAF9',
          100: '#FFFFFF',
          200: '#F1F5F3',
          300: '#E4ECE8',
          400: '#DDE5E1',
          500: '#7A847E',
          600: '#59645D',
          700: '#343F38',
          800: '#232D27',
          900: '#17211B',
          950: '#0C120F',
        },
        // Primary Government Green
        govgreen: {
          50: '#F0FDF4',
          100: '#DCFCE7', // Soft green for compliant
          200: '#BBF7D0',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534', // Primary brand CTA
          900: '#14532D', // Deep institutional green
          950: '#052E16',
        },
        // Trust & Technology Navy
        govnavy: {
          50: '#F5F8FB',
          100: '#EAF1F7', // Navy surface
          200: '#D2E2F0',
          300: '#A4C3DF',
          500: '#3A6B9B',
          700: '#23476E',
          800: '#1B3C5E',
          900: '#17324D', // Deep navy
          950: '#0E1F30',
        },
        // Consumer Action & Scanning Teal
        govteal: {
          50: '#F0FDFA',
          100: '#CCFBF1', // Soft teal
          200: '#99F6E4',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E', // Muted Teal
          800: '#115E59',
          900: '#134E4A',
        },
        // Warning / Attention Amber
        govamber: {
          50: '#FFFBEB',
          100: '#FEF3C7', // Soft amber
          200: '#FDE68A',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309', // Controlled amber
          800: '#92400E',
          900: '#78350F',
        },
        // Potential Non-Compliance Red
        govred: {
          50: '#FEF2F2',
          100: '#FEE4E2', // Soft red
          200: '#FECACA',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B42318', // Muted red
          800: '#991B1B',
          900: '#7F1D1D',
        },
        // Text & Neutral Ink
        govink: {
          primary: '#17211B',
          secondary: '#59645D',
          muted: '#7A847E',
        },
        // Backward-compatible aliases mapped to institutional tokens
        cream: {
          50: '#F8FAF9',
          100: '#FFFFFF', // Clean surface
          200: '#F8FAF9', // App background
          300: '#F1F5F3', // Secondary surface
          400: '#DDE5E1', // Institutional border
          500: '#C7D2CD',
        },
        forest: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          500: '#16A34A',
          600: '#166534',
          700: '#14532D', // Deep institutional green
          800: '#0F3E22',
          900: '#0A2D18',
          950: '#051E10',
        },
        ink: {
          primary: '#17211B',
          secondary: '#59645D',
          muted: '#7A847E',
        },
        status: {
          compliant: '#166534',
          compliantBg: '#DCFCE7',
          compliantBorder: '#BBF7D0',
          review: '#B45309',
          reviewBg: '#FEF3C7',
          reviewBorder: '#FDE68A',
          violation: '#B42318',
          violationBg: '#FEE4E2',
          violationBorder: '#FECACA',
        },
        govblue: {
          50: '#F5F8FB',
          100: '#EAF1F7',
          200: '#D2E2F0',
          500: '#23476E',
          600: '#1B3C5E',
          700: '#17324D',
          800: '#13283E',
          900: '#0E1F30',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Noto Sans Devanagari',
          'Noto Sans Gujarati',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(23, 33, 27, 0.04), 0 1px 3px 0 rgba(23, 33, 27, 0.02)',
        'elevated': '0 4px 6px -1px rgba(23, 33, 27, 0.05), 0 2px 4px -2px rgba(23, 33, 27, 0.03)',
        'modal': '0 20px 25px -5px rgba(23, 33, 27, 0.1), 0 8px 10px -6px rgba(23, 33, 27, 0.05)',
      },
    },
  },
  plugins: [],
}
