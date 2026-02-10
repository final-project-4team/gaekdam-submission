import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.js'],
        include: ['src/test/**/*.test.js'],

        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            reportsDirectory: './coverage',

            // UI/UX 산출물 대상만 커버리지 집계
            include: [
                'src/views/**/*.vue',
                'src/components/**/*.vue',
                'src/layouts/**/*.vue',
                'src/**/modal/**/*.vue',
            ],
            exclude: [
                'src/main.js',
                'src/router/**',
                'src/api/**',
                'src/stores/**',
                'src/composables/**',
                'src/components/ai',
                'src/views/common',
            ],
        },
    },
})
