import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
        globals: false,
        testTimeout: 60000,
        hookTimeout: 60000,
        env: { TZ: 'UTC' },
        setupFiles: ['src/test/setup.ts'],
    },
});