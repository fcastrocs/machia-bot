"use strict";

const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const crypto = require("crypto");

const credential = new Schema({
  userId: { type: String, required: true },
  store: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  cvv: { type: String, required: true, length: 3 },
  cookies: { type: String, required: true },
  proxy: { type: String, required: true },
});

// compound index
credential.index({ userId: 1, store: 1 }, { unique: true });

credential.pre("findOneAndUpdate", function (next) {
  let self = this.getUpdate();
  self.email = encrypt(self.email);
  self.password = encrypt(self.password);
  self.cookies = encrypt(self.cookies);
  self.cvv = encrypt(self.cvv);
  next();
});

credential.post("findOne", (doc, next) => {
  if (doc) {
    doc.email = decrypt(doc.email);
    doc.password = decrypt(doc.password);
    doc.cvv = decrypt(doc.cvv);
    doc.cookies = decrypt(doc.cookies);
  }
  next();
});

// Encryption code taken from:
// https://gist.github.com/vlucas/2bd40f62d20c1d49237a109d491974eb

const IV_LENGTH = 16; // For AES, this is always 16

function encrypt(text) {
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(process.env.ENCRYPTION_KEY),
    iv
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + "★" + encrypted.toString("hex");
}

function decrypt(text) {
  let textParts = text.split("★");
  let iv = Buffer.from(textParts.shift(), "hex");
  let encryptedText = Buffer.from(textParts.join("★"), "hex");
  let decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(process.env.ENCRYPTION_KEY),
    iv
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

module.exports = mongoose.model("Credential", credential);
