/**
 * StoreLogin extends this class
 * Map<userId, StoreLogin instance>
 */

"use strict";

class Verification {}
Verification.map = new Map();

Verification.set = (userId, storeLogin) => {
  Verification.map.set(userId, storeLogin);
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
