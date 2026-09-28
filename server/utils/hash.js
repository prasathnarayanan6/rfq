const bcrypt = require('bcrypt');

async function comparePasswords(plainTextPassword, passwordHash) {
  if (!plainTextPassword || typeof passwordHash !== 'string' || !passwordHash.startsWith('$2')) {
    return false;
  }
  return bcrypt.compare(plainTextPassword, passwordHash);
}

module.exports = { comparePasswords };
