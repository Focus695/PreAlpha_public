import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Custom PreAlpha colors
        success: {
          DEFAULT: 'hsl(142, 76%, 36%)',
          foreground: 'hsl(0, 0%, 100%)',
        },
        warning: {
          DEFAULT: 'hsl(38, 92%, 50%)',
          foreground: 'hsl(0, 0%, 100%)',
        },
        // PreAlpha Dark Theme colors
        base: 'hsl(var(--base))',
        surface1: 'hsl(var(--surface1))',
        surface2: 'hsl(var(--surface2))',
        brand: {
          DEFAULT: 'hsl(var(--brand))',
          muted: 'hsl(var(--brand-muted))',
        },
        txt: {
          main: 'hsl(var(--txt-main))',
          secondary: 'hsl(var(--txt-secondary))',
          muted: 'hsl(var(--txt-muted))',
        },
        profit: 'hsl(var(--profit))',
        loss: 'hsl(var(--loss))',
        down: 'hsl(var(--down))',
        // 交易动作颜色
        amber: '#f59e0b',
        purple: '#a855f7',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        heading: ['Geist', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-brand': '0 0 15px rgba(0, 240, 255, 0.2)',
        'glow-accent': '0 0 10px rgba(204, 255, 0, 0.15)',
        'glow-text': '0 0 10px rgba(0, 240, 255, 0.1)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 150ms ease-out',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [animate],
};

export default config;
