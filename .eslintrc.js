module.exports = {
  env: {
    es6: true,
    node: true,
  },
  plugins: ['prettier'],
  extends: ['standard', 'prettier'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  rules: {
    'prettier/prettier': 'error',
  },
}
