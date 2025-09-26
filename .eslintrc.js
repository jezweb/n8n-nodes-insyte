module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    sourceType: 'module',
  },
  extends: [
    'plugin:n8n-nodes-base/nodes'
  ],
  plugins: [
    'eslint-plugin-n8n-nodes-base'
  ],
  ignorePatterns: [
    '.eslintrc.js',
    'gulpfile.js',
    'dist/**/*',
  ],
  rules: {
    'n8n-nodes-base/node-dirname-against-convention': 'off',
  }
};