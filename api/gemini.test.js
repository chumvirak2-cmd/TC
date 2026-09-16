import test from 'node:test';
import assert from 'node:assert/strict';
import handler from './gemini.js';

test('gemini API route rejects non-POST requests', async () => {
  let statusCode = 200;
  let body = null;

  const req = { method: 'GET', body: null };
  const res = {
    setHeader: () => {},
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (payload) => {
      body = payload;
    },
  };

  await handler(req, res);

  assert.equal(statusCode, 405);
  assert.deepEqual(body, { error: 'Method not allowed' });
});
