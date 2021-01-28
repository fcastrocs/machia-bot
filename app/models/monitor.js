const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let monitor = new Schema({
  itemId: { type: String, required: true },
  store: { type: String, required: true },
  url: { type: String, required: true },
  title: { type: String, required: true },
});

monitor.index({ itemId: 1, store: 1 }, { unique: true });

module.exports = mongoose.model("Monitor", monitor);
