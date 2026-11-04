'use strict';

/**
 * v6.05.26 checkout auth regression.
 * Local HTTP stand-in only. Does not call Stripe, Firebase, or production.
 */

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');

const RELEASE = path.join(__dirname, '..', 'releases', 'v6.05.26');
const LIVE_SUB_SHA256 = '4ff29f7d95ed4e4900e211ec1ae6c20b39da4a3b2daecbd6c7c696b7cddc319c';

function read(rel) {
  return fs.readFileSync(path.join(RELEASE, rel), 'utf8');
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function extractFunction(src, name) {
  const start = src.indexOf('function ' + name);
  assert.notEqual(start, -1, 'missing function ' + name);
  let i = src.indexOf('{', start);
  let depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error('unterminated ' + name);
}

function loadCheckoutFns(src) {
  const source = [
    extractFunction(src, 'resolveCheckoutSessionErrorMessage'),
    extractFunction(src, 'createCheckoutSessionError'),
    extractFunction(src, 'getCheckoutFirebaseIdToken').replace(/^function /, 'async function '),
    extractFunction(src, 'showCheckoutSessionErrorAlert'),
  ].join('\n');
  return new Function(source + '\nreturn { getCheckoutFirebaseIdToken, createCheckoutSessionError, showCheckoutSessionErrorAlert, resolveCheckoutSessionErrorMessage };')();
}

function startGate() {
  const calls = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const auth = req.headers.authorization || '';
      calls.push({ auth, raw });
      if (!auth.startsWith('Bearer ') || auth.trim() === 'Bearer') {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          error: 'MISSING_AUTH',
          message: 'Authorization Bearer Firebase ID token required',
        }));
        return;
      }
      const token = auth.slice('Bearer '.length).trim();
      if (token.length < 8) {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'INVALID_AUTH', message: 'Invalid or expired Firebase ID token' }));
        return;
      }
      const payload = JSON.parse(raw);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        url: 'http://127.0.0.1/stripe-checkout-not-contacted',
        sessionId: 'cs_test_local_only',
        tier: payload.tier,
      }));
    });
  });
  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, calls, url: 'http://127.0.0.1:' + port + '/createCheckoutSession' });
    });
    server.on('error', reject);
  });
}

test('subscription.js auth patch is the only change versus live v6.05.25', () => {
  const src = read('js/features/subscription.js');
  const helperStart = src.indexOf('/**\n * Firebase ID token for createCheckoutSession.');
  const helperEnd = src.indexOf('function clearStripeCheckoutClientState()');
  assert.ok(helperStart > 0 && helperEnd > helperStart);
  let reverted = src.slice(0, helperStart) + src.slice(helperEnd);
  reverted = reverted.replace(
    `    const idToken = await getCheckoutFirebaseIdToken();
    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + idToken
      },
      body: JSON.stringify(subscriptionPayload)
    });
`,
    `    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscriptionPayload)
    });
`
  );
  reverted = reverted.replace(
    `    const archivalIdToken = await getCheckoutFirebaseIdToken();
    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + archivalIdToken
      },
      body: JSON.stringify({
        tier: 'archival',
`,
    `    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier: 'archival',
`
  );
  assert.equal(sha256(reverted), LIVE_SUB_SHA256);
  assert.equal(src.includes('function shouldBlockDuplicateProCheckout'), false);
  assert.match(src, /const currentTier = sub\.tier \|\| 'free'/);
  assert.match(src, /if \(currentTier === 'pro' && hasActiveSubscription\)/);
});

test('cancel, portal, and upgrade still send a Bearer token', () => {
  const src = read('js/features/subscription.js');
  assert.match(src, /cancelSubscription[\s\S]{0,500}'Authorization': 'Bearer ' \+ token/);
  assert.match(src, /cancelArchivalSubscription[\s\S]{0,400}'Authorization': 'Bearer ' \+ token/);
  assert.match(src, /createCustomerPortalSession[\s\S]{0,500}'Authorization': `Bearer \$\{token\}`/);
  assert.match(src, /upgradeArchivalSubscription[\s\S]{0,800}'Authorization': 'Bearer ' \+ upgradeToken/);
  assert.doesNotMatch(src, /constructEvent|whsec_|sk_live|sk_test/);
});

test('token fetch fails closed and a valid token opens a local session', async () => {
  const src = read('js/features/subscription.js');
  const fns = loadCheckoutFns(src);
  const gate = await startGate();
  const realFetch = global.fetch;
  let fetchCalls = 0;
  global.fetch = async function () {
    fetchCalls += 1;
    return realFetch.apply(this, arguments);
  };
  try {
    await assert.rejects(
      () => fns.getCheckoutFirebaseIdToken.call({}),
      (err) => err.checkoutErrorData && err.checkoutErrorData.error === 'MISSING_AUTH'
    );
    global.window = { currentUser: { getIdToken: async () => '   ' } };
    global.firebase = { auth() { return { currentUser: null }; } };
    await assert.rejects(
      () => fns.getCheckoutFirebaseIdToken(),
      (err) => err.checkoutErrorData && err.checkoutErrorData.error === 'MISSING_AUTH'
    );
    global.window = { currentUser: { getIdToken: async () => { throw new Error('network'); } } };
    await assert.rejects(
      () => fns.getCheckoutFirebaseIdToken(),
      (err) => err.checkoutErrorData && err.checkoutErrorData.error === 'INVALID_AUTH'
    );
    assert.equal(fetchCalls, 0);

    global.window = { currentUser: { uid: 'uid-test-only', getIdToken: async () => 'test-token-not-a-jwt' } };
    const token = await fns.getCheckoutFirebaseIdToken();
    const response = await realFetch(gate.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({ tier: 'pro', uid: 'uid-test-only' }),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.sessionId, 'cs_test_local_only');
    assert.equal(body.url.includes('stripe.com'), false);
    assert.equal(gate.calls[0].auth, 'Bearer test-token-not-a-jwt');

    delete global.window.currentUser.getIdToken;
    global.firebase = { auth() { return { currentUser: { getIdToken: async () => 'firebase-fallback-token' } }; } };
    const fallback = await fns.getCheckoutFirebaseIdToken();
    const arch = await realFetch(gate.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + fallback },
      body: JSON.stringify({ tier: 'archival', uid: 'uid-test-only' }),
    });
    assert.equal(arch.status, 200);
    assert.equal((await arch.json()).tier, 'archival');

    const shown = [];
    global.showCustomAlert = (msg) => shown.push(msg);
    fns.showCheckoutSessionErrorAlert(
      fns.createCheckoutSessionError({ error: 'MISSING_AUTH', message: 'Authorization Bearer Firebase ID token required' }, (_k, fb) => fb),
      (key, fb) => (key === 'subscriptionCheckoutCreateError' ? 'Checkout session létrehozása sikertelen' : fb),
      {}
    );
    assert.match(shown[0], /Checkout session létrehozása sikertelen/);
    assert.equal(shown[0].includes('Firebase ID token'), false);
  } finally {
    global.fetch = realFetch;
    delete global.window;
    delete global.firebase;
    delete global.showCustomAlert;
    await new Promise((resolve) => gate.server.close(resolve));
  }
});

test('v6.05.26 version and cache-bust stay aligned with the service worker', () => {
  const index = read('index.html');
  const sw = read('gurigo-sw.js');
  const boot = read('js/boot/bootManifest.js');
  const info = read('js/config/appInfo.js');
  assert.match(index, /base href="\/releases\/v6\.05\.26\/"/);
  assert.match(index, /release: 'v6\.05\.26'/);
  assert.match(index, /content="6\.05\.26"/);
  assert.match(index, /gurigo-sw\.js\?v=60526checkout1/);
  assert.match(index, /sw-root\.js\?v=60526checkout1/);
  assert.match(index, /bootManifest\.js\?v=60526checkout1/);
  assert.match(index, /manifest\.webmanifest\?v=60526checkout1/);
  assert.match(info, /version: '6\.05\.26'/);
  assert.match(info, /releaseDate: '2026-11-04'/);
  assert.match(sw, /gurigo-cache-v6\.05\.26-checkout1/);
  assert.match(sw, /gurigo-runtime-v6\.05\.26-checkout1/);
  assert.match(sw, /OWNED_CACHE_PREFIXES = \['gurigo-cache-v6\.05\.', 'gurigo-runtime-v6\.05\.'\]/);
  assert.match(sw, /Never root or v7/);
  assert.equal(sw.includes('gurigo-cache-v7'), false);
  const subQuery = 'js/features/subscription.js?v=60526checkout1';
  assert.equal(boot.includes(subQuery), true);
  assert.equal(sw.includes(subQuery), true);
  assert.equal(boot.includes('subscription.js?v=60517console1'), false);
  assert.equal(sw.includes('60525swiso1'), false);
  assert.equal(index.includes('/releases/v6.05.25/'), false);
  assert.match(index, /time: '2026-11-04'/);
  assert.match(read('js/services/offlineColdStartDiag.js'), /\/releases\/v6\.05\.26\//);
  assert.match(read('js/services/announcementsService.js'), /: '6\.05\.26'/);
  assert.match(read('js/services/activeShiftSync.js'), /production-swiso-60526/);
  assert.equal(sw.includes('announcementsService.js?v=60526checkout1'), true);
  assert.equal(boot.includes('announcementsService.js?v=60526checkout1'), true);
  assert.equal(sw.includes('offlineColdStartDiag.js?v=60526checkout1'), true);
  assert.equal(info.includes("termsDocVersion: 'v6.04.02'"), true);
});
