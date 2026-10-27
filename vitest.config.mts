import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    env: {
      // src/main.ts auto-runs on import when CI=true unless this is set
      COMMAND_ACTION_TEST: 'true'
    },
    coverage: {
      provider: 'v8',
      enabled: true,
      reporter: ['json-summary', 'text', 'lcov'],
      include: ['src/**'],
      thresholds: {lines: 100}
    }
  }
})