// Checks for slips that the tests may not catch: misspelt names, things that are never used, and the like.
// Run with `npm run lint`. The rules are listed here so that nothing has to be installed in the project.
const browser = [
  'window',
  'document',
  'localStorage',
  'sessionStorage',
  'navigator',
  'performance',
  'requestAnimationFrame',
  'Image',
  'fetch',
];
const shared = ['console', 'URL', 'Blob', 'setTimeout', 'clearTimeout', 'structuredClone'];
const node = ['process'];
const globals = (names) => Object.fromEntries(names.map((name) => [name, 'readonly']));

const rules = {
  'no-undef': 'error',
  'no-unused-vars': ['error', { args: 'after-used', caughtErrors: 'none' }],
  'no-const-assign': 'error',
  'no-dupe-keys': 'error',
  'no-dupe-args': 'error',
  'no-dupe-else-if': 'error',
  'no-duplicate-case': 'error',
  'no-duplicate-imports': 'error',
  'no-func-assign': 'error',
  'no-import-assign': 'error',
  'no-redeclare': 'error',
  'no-self-assign': 'error',
  'no-self-compare': 'error',
  'no-shadow-restricted-names': 'error',
  'no-unreachable': 'error',
  'no-unsafe-negation': 'error',
  'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
  'no-use-before-define': ['error', { functions: false, classes: false, variables: false }],
  'use-isnan': 'error',
  'valid-typeof': 'error',
  eqeqeq: ['error', 'always', { null: 'ignore' }],
};

export default [
  { files: ['src/**/*.js'], languageOptions: { globals: globals([...browser, ...shared]) }, rules },
  // The game logic must not touch the browser, so it gets none of its names.
  { files: ['src/sim/**/*.js'], languageOptions: { globals: globals([]) }, rules },
  {
    files: ['tests/**/*.{js,mjs}', 'eslint.config.js'],
    languageOptions: { globals: globals([...browser, ...shared, ...node]) },
    rules,
  },
];
