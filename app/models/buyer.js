const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let buyer = new Schema({
  userId: { type: String, required: true },
  store: { type: String, required: true },
  itemId: { type: String, required: true },
});

buyer.index({ userId: 1, store: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model("Buyer", buyer);
