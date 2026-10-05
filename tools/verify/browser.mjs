// Shared headless-browser launcher for the verify scripts (cached
// playwright chromium headless shell, software GL).
import { chromium } from 'playwright-core';
import os from 'os';

export const BASE = process.env.WOLFDECK_URL ?? 'http://localhost:3000';

export async function launch(viewport = { width: 1600, height: 900 }) {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH
      ?? `${os.homedir()}/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell`,
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport });
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' || /\[wolfdeck\]/.test(t)) console.log('CONSOLE', t.slice(0, 300));
  });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  return { browser, page };
}
