import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: {
          alias: {
            '@': path.resolve(__dirname, '.'),
          },
        },
        test: {
          name: 'app',
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          globals: true,
          css: false,
          include: ['**/*.{test,spec}.{ts,tsx}'],
          exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.{idea,git,cache,output,temp}/**',
            '**/.worktrees/**',
            'supabase/tests/**',
          ],
        },
      },
      {
        resolve: {
          alias: {
            '@': path.resolve(__dirname, '.'),
          },
        },
        test: {
          name: 'rls',
          environment: 'node',
          globals: true,
          include: ['supabase/tests/**/*.test.ts'],
          exclude: ['**/node_modules/**', '**/.worktrees/**'],
        },
      },
    ],
  },
});
