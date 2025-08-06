module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-native/all',
    'plugin:prettier/recommended', // ⚡ auto-fixes style with Prettier
  ],
  plugins: ['react', 'react-native', 'prettier'],
  env: {
    browser: true,
    node: true,
    es2021: true,
    'react-native/react-native': true,
  },
  rules: {
    'prettier/prettier': 'warn',
    'react/prop-types': 'off',
    'react-native/no-inline-styles': 'off',
    'no-unused-vars': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
