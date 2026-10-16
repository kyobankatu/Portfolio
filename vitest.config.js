import { defineConfig } from 'vitest/config'

export default defineConfig({
    esbuild: { jsx: 'automatic' },
    test: {
        environment: 'jsdom',
        setupFiles: ['./tests/setup.js'],
        include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.jsx'],
        restoreMocks: true,
    },
})
