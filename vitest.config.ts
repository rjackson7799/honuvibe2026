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
            // Live evaluator calibration is opt-in only (see `evaluator-live`
            // project below) — never run it in the default `app`/CI suite.
            '**/*.live.test.ts',
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
      {
        resolve: {
          alias: {
            '@': path.resolve(__dirname, '.'),
          },
        },
        test: {
          // Live model-calibration suite for the Apply-It Workbench evaluator.
          // Calls the real evaluateAttempt() against the Anthropic API, so it is
          // isolated from the default `app`/`test:run` (CI) project and gated at
          // runtime on RUN_LIVE_EVAL=1 + ANTHROPIC_API_KEY. Run manually with
          // `pnpm test:eval` before any evaluator-model bump or prompt change.
          // See docs/plans/2026-05-27-apply-it-workbench-v1.md.
          name: 'evaluator-live',
          environment: 'node',
          globals: true,
          include: ['__tests__/workbench/**/*.live.test.ts'],
          exclude: ['**/node_modules/**', '**/.worktrees/**'],
        },
      },
    ],
  },
});
