import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

/** Config plate ESLint 9. `next lint` etant deprecie, on appelle eslint directement. */
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'public/sw.js', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Les entites HTML rendent le JSX moins lisible que les apostrophes typographiques.
      'react/no-unescaped-entities': 'off',
    },
  },
];

export default config;
