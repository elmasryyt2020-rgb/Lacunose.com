import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@lacunose/types': resolve(__dirname, 'packages/types/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['evals/**/*.{test,smoke.test}.ts', 'src/**/*.test.ts'],
  },
});
