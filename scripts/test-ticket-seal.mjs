#!/usr/bin/env node
// The seal check the door runs, against a key pair made here.
//
// It signs a code the same way the server does (ECDSA P-256, SHA-256, raw
// r || s, over `vent-ticket:` + code) and then asks src/lib/ticketSeal.js to
// judge it. A good seal must verify; a seal for another code, a code with one
// character changed, a short seal and a missing seal must not.
//
//   node scripts/test-ticket-seal.mjs

import { webcrypto } from 'node:crypto';
import { splitScan, verifySeal } from '../src/lib/ticketSeal.js';

const { subtle } = webcrypto;
const encoder = new TextEncoder();

let passed = 0;
let failed = 0;
const check = (name, ok) => {
  if (ok) passed += 1; else failed += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
};

const toBase64url = bytes => Buffer.from(bytes).toString('base64url');

const { privateKey, publicKey } = await subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwk = await subtle.exportKey('jwk', publicKey);

const sign = async code => toBase64url(new Uint8Array(await subtle.sign(
  { name: 'ECDSA', hash: 'SHA-256' }, privateKey, encoder.encode(`vent-ticket:${code}`))));

const CODE = 'VT-7K2QXM9D';
const seal = await sign(CODE);
const otherSeal = await sign('VT-AAAAAAAA');
const flipped = `VT-7K2QXM9E`;

check('seal is 86 characters', seal.length === 86);
check('a good seal verifies', await verifySeal(jwk, CODE, seal) === true);
check('a seal for another code fails', await verifySeal(jwk, CODE, otherSeal) === false);
check('a one-character change to the code fails', await verifySeal(jwk, flipped, seal) === false);
check('a short seal fails', await verifySeal(jwk, CODE, seal.slice(0, 40)) === false);
check('a seal with a character outside base64url fails', await verifySeal(jwk, CODE, `${seal.slice(0, 85)}+`) === false);
check('no key answers false, never throws', await verifySeal(null, CODE, seal) === false);

const withSeal = splitScan(`${CODE}.${seal}`);
check('splitScan separates the code from the seal', withSeal.code === CODE && withSeal.seal === seal);
const bare = splitScan('  vt-7k2qxm9d ');
check('splitScan gives a bare code with seal ""', bare.code === CODE && bare.seal === '');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
