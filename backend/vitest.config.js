const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.js'],
  },
});
