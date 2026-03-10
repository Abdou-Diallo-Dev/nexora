import type { Config } from 'tailwindcss';
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: '#fff' },
        'muted-foreground': 'hsl(var(--muted-foreground))',
      },
      boxShadow: { card: '0 1px 3px 0 rgb(0 0 0 / 0.07)' },
    },
  },
  plugins: [],
};
export default config;
