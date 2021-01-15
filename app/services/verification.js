/**
 * StoreLogin extends this class
 * Map<userId, StoreLogin instance>
 */

"use strict";

class Verification {}
Verification.map = new Map();

Verification.set = (userId, storeLogin) => {
  Verification.map.set(userId, storeLogin);

  // Remove verification after some time.
  setTimeout(() => {
    Verification.remove(userId);
  }, process.env.VERIFY_TIMEOUT);
};

Verification.has = (userId) => {
  return Verification.map.has(userId);
};

Verification.get = (userId) => {
  return Verification.map.get(userId);
};

Verification.remove = (userId) => {
  return Verification.map.delete(userId);
};

module.exports = Verification;
