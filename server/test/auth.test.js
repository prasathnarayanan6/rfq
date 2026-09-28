const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { comparePasswords } = require('../utils/hash');

test('password verification accepts bcrypt hashes and rejects invalid values', async () => {
  const hash = await bcrypt.hash('correct horse battery staple', 4);
  assert.equal(await comparePasswords('correct horse battery staple', hash), true);
  assert.equal(await comparePasswords('wrong password', hash), false);
  assert.equal(await comparePasswords('plain text', 'plain text'), false);
  assert.equal(await comparePasswords('', hash), false);
});
