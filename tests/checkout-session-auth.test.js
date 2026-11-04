'use strict';

/**
 * Regression tests for production createCheckoutSession auth.
 * Uses a local HTTP stand-in with the same 401 contract observed on the
 * deployed function. Does not call Stripe, Firebase, or production.
 */

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const SRC_PATH = path.join(
  __dirname,
  '..',
  'releases',
  'v6.05.26',
  'js',
  'features',
  'subscription.js'
);

const PRODUCTION_V6_05_25_SHA256 = '4ff29f7d95ed4e4900e211ec1ae6c20b39da4a3b2daecbd6c7c696b7cddc319c';

const MISSING_AUTH_BODY = {
  error: 'MISSING_AUTH',
  message: 'Authorization Bearer Firebase ID token required',
};

function readSrc() {
  return fs.readFileSync(SRC_PATH, 'utf8');
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function revertCheckoutAuthPatch(src) {
  const proNew = `    showStripeCheckoutLoading(loadingMsg);

    // createCheckoutSession rejects requests without a Firebase ID token (HTTP 401 MISSING_AUTH).
    const idToken = await (window.currentUser.getIdToken
      ? window.currentUser.getIdToken()
      : firebase.auth().currentUser.getIdToken());
    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + idToken
      },
      body: JSON.stringify(subscriptionPayload)
    });
`;
  const proOld = `    showStripeCheckoutLoading(loadingMsg);

    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscriptionPayload)
    });
`;
  const archNew = `    clearStripeCheckoutClientState();

    // Same auth requirement as Pro checkout (HTTP 401 MISSING_AUTH without a Bearer token).
    const archivalIdToken = await (window.currentUser.getIdToken
      ? window.currentUser.getIdToken()
      : firebase.auth().currentUser.getIdToken());
    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + archivalIdToken
      },
      body: JSON.stringify({
        tier: 'archival',
`;
  const archOld = `    clearStripeCheckoutClientState();

    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier: 'archival',
`;
  assert.equal(src.split(proNew).length, 2);
  assert.equal(src.split(archNew).length, 2);
  return src.replace(proNew, proOld).replace(archNew, archOld);
}

function extractFunction(src, name) {
  const start = src.indexOf('function ' + name);
  assert.notEqual(start, -1, 'missing function ' + name);
  let i = src.indexOf('{', start);
  let depth = 0;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return src.slice(start, i + 1);
      }
    }
  }
  throw new Error('unterminated function ' + name);
}

function sliceBetween(src, startMarker, endMarker, fromIndex) {
  const start = src.indexOf(startMarker, fromIndex || 0);
  assert.notEqual(start, -1, 'missing ' + startMarker);
  const end = src.indexOf(endMarker, start);
  assert.notEqual(end, -1, 'missing ' + endMarker);
  return src.slice(start, end);
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function startLocalCheckoutGate() {
  const calls = [];
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const auth = req.headers.authorization || '';
      calls.push({
        method: req.method,
        auth,
        raw,
        url: req.url,
      });
      if (req.method !== 'POST') {
        res.writeHead(405, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }));
        return;
      }
      if (!auth.startsWith('Bearer ') || auth.trim() === 'Bearer') {
        res.writeHead(401, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(MISSING_AUTH_BODY));
        return;
      }
      const token = auth.slice('Bearer '.length).trim();
      if (token === 'invalid' || token.length < 8) {
        res.writeHead(401, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          error: 'INVALID_AUTH',
          message: 'Invalid or expired Firebase ID token',
        }));
        return;
      }
      let payload = {};
      try {
        payload = JSON.parse(raw);
      } catch (_) {
        payload = {};
      }
      if (!payload.tier || !payload.uid) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'INVALID_TIER' }));
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        url: 'http://127.0.0.1/stripe-checkout-not-contacted',
        sessionId: 'cs_test_local_only',
      }));
    });
  });

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        calls,
        url: 'http://127.0.0.1:' + port + '/createCheckoutSession',
      });
    });
    server.on('error', reject);
  });
}

function clientContext(token, options) {
  const opts = options || {};
  const tokenSource = opts.tokenSource || 'currentUser';
  const currentUser = {
    uid: 'uid-test-only',
    email: 'checkout-test@example.invalid',
  };
  if (tokenSource === 'currentUser') {
    currentUser.getIdToken = async () => token;
  }
  const firebaseUser = tokenSource === 'firebase' ? { getIdToken: async () => token } : null;
  return {
    window: {
      currentUser,
      BILLING_CONFIG: { testMode: true, env: 'test' },
    },
    firebase: {
      auth() {
        return { currentUser: firebaseUser };
      },
    },
  };
}

test('checkout auth patch is the only change versus production v6.05.25', () => {
  const src = readSrc();
  assert.equal(sha256(revertCheckoutAuthPatch(src)), PRODUCTION_V6_05_25_SHA256);
});

test('subscription management calls still send a Bearer token', () => {
  const src = readSrc();
  assert.match(src, /cancelSubscription[\s\S]{0,500}'Authorization': 'Bearer ' \+ token/);
  assert.match(src, /cancelArchivalSubscription[\s\S]{0,400}'Authorization': 'Bearer ' \+ token/);
  assert.match(src, /createCustomerPortalSession[\s\S]{0,400}'Authorization': `Bearer \$\{token\}`/);
  assert.match(src, /upgradeArchivalSubscription[\s\S]{0,700}'Authorization': 'Bearer ' \+ upgradeToken/);
  assert.doesNotMatch(src, /constructEvent|whsec_|sk_live|sk_test/);
});

test('MISSING_AUTH still maps to the generic checkout message, not the raw backend text', () => {
  const src = readSrc();
  const resolve = new Function(
    'return ' + extractFunction(src, 'resolveCheckoutSessionErrorMessage')
  )();
  const t = (key, fallback) => {
    if (key === 'subscriptionCheckoutCreateError') return 'Checkout session létrehozása sikertelen';
    return fallback;
  };
  const message = resolve(MISSING_AUTH_BODY, t);
  assert.equal(message, 'Checkout session létrehozása sikertelen');
  assert.equal(message.includes('Firebase ID token'), false);
  assert.equal(
    resolve({ error: 'PRICE_NOT_CONFIGURED' }, t),
    'Invalid subscription plan.'
  );
  assert.equal(
    resolve({ error: 'ALREADY_HAS_ACTIVE_PRO' }, (_, fallback) => fallback)
      .includes('already have an active Pro'),
    true
  );
});

test('pro and archival checkout snippets obtain a session from the local gate', async () => {
  const src = readSrc();
  const gate = await startLocalCheckoutGate();
  try {
    const proSnippet = sliceBetween(
      src,
      'const idToken = await (window.currentUser.getIdToken',
      'if (!response.ok)'
    );
    const proRun = new AsyncFunction(
      'window',
      'firebase',
      'CLOUD_FUNCTION_URL',
      'subscriptionPayload',
      proSnippet + '\nreturn response;'
    );
    const ctx = clientContext('test-token-not-a-jwt');
    const proResponse = await proRun(
      ctx.window,
      ctx.firebase,
      gate.url,
      {
        tier: 'pro',
        uid: 'uid-test-only',
        userEmail: 'checkout-test@example.invalid',
        countryCode: 'HU',
        testMode: true,
        trackingMetadata: {},
        locale: 'hu',
        attemptId: 'attempt-pro',
      }
    );
    assert.equal(proResponse.status, 200);
    const proData = await proResponse.json();
    assert.equal(proData.sessionId, 'cs_test_local_only');
    assert.equal(proData.url.includes('stripe.com'), false);
    assert.equal(gate.calls[0].auth, 'Bearer test-token-not-a-jwt');
    assert.equal(JSON.parse(gate.calls[0].raw).tier, 'pro');

    const archSnippet = sliceBetween(
      src,
      'const archivalIdToken = await (window.currentUser.getIdToken',
      'if (!response.ok)'
    );
    const archRun = new AsyncFunction(
      'window',
      'firebase',
      'CLOUD_FUNCTION_URL',
      'trackingMetadata',
      'resolveCheckoutCountryCode',
      'createCheckoutAttemptId',
      archSnippet + '\nreturn response;'
    );
    const archResponse = await archRun(
      ctx.window,
      ctx.firebase,
      gate.url,
      {},
      () => 'HU',
      () => 'attempt-archival'
    );
    assert.equal(archResponse.status, 200);
    const archData = await archResponse.json();
    assert.equal(archData.url, 'http://127.0.0.1/stripe-checkout-not-contacted');
    assert.equal(gate.calls[1].auth, 'Bearer test-token-not-a-jwt');
    const archBody = JSON.parse(gate.calls[1].raw);
    assert.equal(archBody.tier, 'archival');
    assert.equal(archBody.countryCode, 'HU');
    assert.equal(archBody.uid, 'uid-test-only');

    const fallbackCtx = clientContext('firebase-fallback-token', { tokenSource: 'firebase' });
    const fallbackResponse = await proRun(
      fallbackCtx.window,
      fallbackCtx.firebase,
      gate.url,
      {
        tier: 'pro',
        uid: 'uid-test-only',
        userEmail: '',
        countryCode: 'DE',
        testMode: true,
        trackingMetadata: {},
        locale: 'de',
        attemptId: 'attempt-fallback',
      }
    );
    assert.equal(fallbackResponse.status, 200);
    assert.equal(gate.calls[2].auth, 'Bearer firebase-fallback-token');
    assert.equal(JSON.parse(gate.calls[2].raw).countryCode, 'DE');
  } finally {
    await new Promise((resolve) => gate.server.close(resolve));
  }
});

test('the pre-fix request shape is rejected with MISSING_AUTH and does not create a session', async () => {
  const gate = await startLocalCheckoutGate();
  try {
    const response = await fetch(gate.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier: 'pro',
        uid: 'uid-test-only',
        userEmail: '',
        countryCode: 'HU',
        testMode: true,
        locale: 'hu',
        attemptId: 'attempt-no-auth',
      }),
    });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), MISSING_AUTH_BODY);
    assert.equal(gate.calls[0].auth, '');

    const invalid = await fetch(gate.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid',
      },
      body: JSON.stringify({ tier: 'pro', uid: 'uid-test-only' }),
    });
    assert.equal(invalid.status, 401);
    assert.equal((await invalid.json()).error, 'INVALID_AUTH');
    assert.equal(gate.calls.some((call) => String(call.raw).includes('cs_test')), false);
  } finally {
    await new Promise((resolve) => gate.server.close(resolve));
  }
});

test('checkout success still redirects to the returned url and does not write entitlements', () => {
  const src = readSrc();
  const proSuccess = sliceBetween(
    src,
    'const data = await response.json();\n\n    // === SUBSCRIPTION RESUME HANDLING ===',
    'window.location.href = data.url;'
  );
  assert.match(proSuccess, /data\.action === 'resume'/);
  assert.doesNotMatch(proSuccess, /subscriptionTier|checkout\.sessions|firestore/);
  const archSuccess = sliceBetween(
    src,
    'const data = await response.json();\n    if (!data.url)',
    'window.location.href = data.url;'
  );
  assert.match(archSuccess, /Checkout URL hiányzik/);
  assert.doesNotMatch(archSuccess, /subscriptionTier|firestore|webhook/);
});
