module.exports = {
  extends: [
    'expo',
    '@react-native',
    'eslint-config-prettier'
  ],
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks'
  ],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off'
  },
  env: {
    node: true,
    browser: true,
    'react-native/react-native': true
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
}; 