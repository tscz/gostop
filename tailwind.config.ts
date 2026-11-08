import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Off-scale steps the components use for faint borders/backgrounds
      // (Tailwind's default opacity scale only has multiples of 5)
      opacity: { 3: '0.03', 6: '0.06', 8: '0.08', 14: '0.14' },
    },
  },
  plugins: [],
} satisfies Config
