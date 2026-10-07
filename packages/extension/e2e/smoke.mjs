/**
 * Verifies the built extension in real Chrome: the manifest loads, the service
 * worker starts, the side panel renders, and a ping completes the full round trip
 * through the content script.
 *
 * Not part of `npm test`. It needs a display and a Chrome install, and it is slow.
 * Run it against a fresh build: `npm run build && npm run test:e2e`.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const EXTENSION = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const profile = mkdtempSync(join(tmpdir(), 'devflow-e2e-'));

const server = createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/html' });
  response.end('<!doctype html><title>Target</title><h1>target page</h1>');
}).listen(0);
const origin = `http://localhost:${server.address().port}/`;

// Chrome 137+ ignores --load-extension, so the extension is installed over CDP.
// ignoreDefaultArgs drops Playwright's --disable-extensions, which blocks it outright.
const context = await chromium.launchPersistentContext(profile, {
  channel: 'chrome',
  headless: false,
  ignoreDefaultArgs: ['--disable-extensions'],
});

try {
  const cdp = await context.browser().newBrowserCDPSession();
  const { id } = await cdp.send('Extensions.loadUnpacked', { path: EXTENSION });

  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent('serviceworker', { timeout: 15000 }));
  assert.equal(
    worker.url(),
    `chrome-extension://${id}/service-worker.js`,
    'service worker started',
  );

  const panel = await context.newPage();
  const pageErrors = [];
  panel.on('pageerror', (error) => pageErrors.push(error.message));
  await panel.goto(`chrome-extension://${id}/sidepanel.html`);

  await panel.getByRole('button', { name: 'Check active page' }).waitFor({ timeout: 5000 });
  assert.deepEqual(pageErrors, [], 'side panel rendered without errors');

  const ping = () => panel.evaluate(() => chrome.runtime.sendMessage({ type: 'devflow:ping' }));

  // The side panel is the active tab here, so this exercises the restricted-scheme path.
  const onExtensionPage = await ping();
  assert.equal(onExtensionPage.success, false);
  assert.equal(onExtensionPage.error.code, 'FORBIDDEN');

  const target = await context.newPage();
  await target.goto(origin);
  await target.bringToFront();
  await panel.waitForTimeout(500);

  // activeTab is not live for a tab the user never invoked the extension on, so the
  // tab's url is hidden. This must be reported as unreadable, not as a missing tab.
  const beforeGrant = await ping();
  assert.equal(beforeGrant.success, false);
  assert.equal(beforeGrant.error.code, 'FORBIDDEN');
  assert.equal(beforeGrant.error.details.needsHostPermission, true);

  const granted = await panel.evaluate(() => chrome.permissions.request({ origins: ['*://*/*'] }));
  assert.equal(granted, true, 'host permission granted');

  await target.bringToFront();
  await panel.waitForTimeout(500);

  const afterGrant = await ping();
  assert.equal(afterGrant.success, true, `ping failed: ${JSON.stringify(afterGrant)}`);
  assert.equal(afterGrant.data.ready, true);
  assert.equal(afterGrant.data.url, origin);

  console.log('e2e: all assertions passed');
} finally {
  await context.close();
  server.close();
  rmSync(profile, { recursive: true, force: true });
}
