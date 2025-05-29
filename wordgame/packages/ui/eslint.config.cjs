const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Add custom rules here
    },
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
    },
    rules: {
      // Add custom rules here
    },
  },
]; 