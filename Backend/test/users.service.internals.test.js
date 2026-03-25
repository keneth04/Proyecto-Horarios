const test = require('node:test');
const assert = require('node:assert/strict');

const { UsersServiceInternals } = require('../src/users/services');

test('normalizeEmailInput aplica trim + lowercase', () => {
  const email = UsersServiceInternals.normalizeEmailInput('  ADMIN@Example.COM  ');
  assert.equal(email, 'admin@example.com');
});

test('normalizeEmailInput rechaza email inválido', () => {
  assert.throws(
    () => UsersServiceInternals.normalizeEmailInput('  invalid-email  '),
    /Email inválido/
  );
});

test('isMongoDuplicateKeyError detecta error 11000', () => {
  assert.equal(UsersServiceInternals.isMongoDuplicateKeyError({ code: 11000 }), true);
  assert.equal(UsersServiceInternals.isMongoDuplicateKeyError({ code: 50 }), false);
});

test('mapDuplicateEmailError mapea duplicate key a Conflict', () => {
  assert.throws(
    () => UsersServiceInternals.mapDuplicateEmailError({ code: 11000 }, 'El usuario ya existe'),
    /El usuario ya existe/
  );
});