import { defineConfig } from 'vitest/config';

// Standalone test config: keeps the production build (tsc && vite build) and
// vite.config.ts untouched. Tests are local fixtures + mocked responses only;
// the real model API is never called.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
