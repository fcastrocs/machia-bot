const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let watcher = new Schema({
  userId: { type: String, required: true },
  store: { type: String, required: true },
  itemId: { type: String, required: true },
});

watcher.index({ userId: 1, store: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model("Watcher", watcher);
