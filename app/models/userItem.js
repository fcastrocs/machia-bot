const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let userItem = new Schema({
  userId: { type: String, ref: "Credential", required: true },
  itemId: { type: String, ref: "Job", required: true },
  store: { type: String, required: true },
  url: { type: String, required: true },
});

// compound index
userItem.index({ userId: 1, itemId: 1, store: 1 }, { unique: true });

module.exports = mongoose.model("UserItem", userItem);
