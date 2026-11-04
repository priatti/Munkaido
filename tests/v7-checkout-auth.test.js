'use strict';

/**
 * Read-only check of the live v7.02.02 subscription.js snapshot.
 * The beta file already sends a Firebase ID token. This test fails if that
 * snapshot is edited. V7 rules, tachograph, and the Oct 11 guard stay as captured.
 */

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const FIXTURE = path.join(__dirname, 'fixtures', 'v7.02.02-subscription.js');
const LIVE_V7_SHA256 = '63df9224e0b016ff8ea9d177b11e46feb4a5e5c4328384393db849646c4f61a5';

function extractFunction(src, name) {
  const start = src.indexOf('function ' + name);
  assert.notEqual(start, -1, name);
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

test('v7.02.02 checkout snapshot is unchanged and already sends a Bearer token', () => {
  const src = fs.readFileSync(FIXTURE, 'utf8');
  const hash = crypto.createHash('sha256').update(src).digest('hex');
  assert.equal(hash, LIVE_V7_SHA256);
  assert.match(src, /const idToken = await \(window\.currentUser\.getIdToken[\s\S]{0,400}'Authorization': 'Bearer ' \+ idToken/);
  assert.match(src, /const archivalIdToken = await \(window\.currentUser\.getIdToken[\s\S]{0,400}'Authorization': 'Bearer ' \+ archivalIdToken/);
  assert.match(src, /function shouldBlockDuplicateProCheckout|window\.shouldBlockDuplicateProCheckout/);
  assert.match(src, /shouldBlockDuplicateProCheckout\(sub, checkoutGuards\)/);
  const resolve = new Function('return ' + extractFunction(src, 'resolveCheckoutSessionErrorMessage'))();
  const message = resolve(
    { error: 'MISSING_AUTH', message: 'Authorization Bearer Firebase ID token required' },
    (key, fb) => (key === 'subscriptionCheckoutCreateError' ? 'Checkout session létrehozása sikertelen' : fb)
  );
  assert.equal(message, 'Checkout session létrehozása sikertelen');
  assert.equal(message.includes('Firebase ID token'), false);
});
