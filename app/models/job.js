const mongoose = require("mongoose");
const Schema = mongoose.Schema;

let job = new Schema({
  itemId: { type: String, required: true, index: true },
  store: { type: String, required: true },
  url: { type: String, required: true },
});

job.index({ itemId: 1, store: 1 }, { unique: true });

module.exports = mongoose.model("Job", job);
