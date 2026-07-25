import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        statements: 60,
        branches: 55,
        functions: 60,
        lines: 60,
      },
      include: [
        'src/domain/**/*.ts',
        'src/persistence/**/*.ts',
        'src/backup/**/*.ts',
        'src/media/capabilities.ts',
        'src/migrations/**/*.ts',
      ],
    },
  },
});
