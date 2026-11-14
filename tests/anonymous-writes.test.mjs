import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

async function loadTS(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { createAnonymousToken, verifyAnonymousToken } = await loadTS('../src/lib/anonymousIdentity.ts');
const { anonymousMutation } = await loadTS('../src/lib/anonymousMutation.ts');

test('signed anonymous identities are stable, unique, and reject tampering', () => {
  const token = createAnonymousToken('test-secret');
  assert.equal(verifyAnonymousToken(token, 'test-secret'), token.split('.')[0]);
  assert.notEqual(createAnonymousToken('test-secret'), token);
  assert.equal(verifyAnonymousToken(token, 'other-secret'), null);
  assert.equal(verifyAnonymousToken(`${token.split('.')[0]}.${'0'.repeat(64)}`, 'test-secret'), null);
  for (const value of [undefined, '', 'fake', `${token}.extra`, 'a.b', 'x'.repeat(200)]) {
    assert.equal(verifyAnonymousToken(value, 'test-secret'), null);
  }
});

test('cookie handshake retries the identical write only once', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push({ url, ...init });
    return new Response('{}', { status: calls.length === 1 ? 428 : 200 });
  });
  const response = await anonymousMutation('{"name":"test"}', 'POST');
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(calls[0].credentials, 'same-origin');
});

test('disabled cookies cannot cause an endless retry', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 428 }));
  assert.equal((await anonymousMutation('{}', 'PATCH')).status, 428);
  assert.equal(mock.mock.callCount(), 2);
});

test('quota, server errors, and successes are never automatically replayed', async (t) => {
  for (const status of [200, 400, 404, 429, 500]) {
    const mock = t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status }));
    assert.equal((await anonymousMutation('{}', 'PATCH')).status, status);
    assert.equal(mock.mock.callCount(), 1);
    mock.mock.restore();
  }
});

test('network failures are not replayed because the write may already be committed', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('network'); });
  await assert.rejects(anonymousMutation('{}', 'POST'), /network/);
  assert.equal(mock.mock.callCount(), 1);
});
