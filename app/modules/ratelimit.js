"use strict";

class RateLimit {}
RateLimit.set = new Set();

RateLimit.add = (userId) => {
  RateLimit.set.add(userId);
};

RateLimit.has = (userId) => {
  return RateLimit.set.has(userId);
};

RateLimit.remove = (userId) => {
  return RateLimit.set.delete(userId);
};

module.exports = RateLimit;