import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from '@playwright/test';

function findLocalChromiumExecutable(): string | undefined {
  const cacheDir = join(homedir(), '.cache', 'ms-playwright');
  if (!existsSync(cacheDir)) return undefined;

  const entries = readdirSync(cacheDir)
    .filter((name) => name.startsWith('chromium-'))
    .toSorted()
    .toReversed();

  for (const dir of entries) {
    for (const sub of ['chrome-linux64/chrome', 'chrome-linux/chrome']) {
      const candidate = join(cacheDir, dir, sub);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return undefined;
}

const executablePath = process.env.CI ? undefined : findLocalChromiumExecutable();

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://127.0.0.1:4173/lafontaine-recitation-training/',
    headless: true,
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/lafontaine-recitation-training/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
