"use strict";
const mongoose = require("mongoose");
const help = new mongoose.Schema(
  {
    subject: {
      type: String,
    },
    detail: {
      type: String,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enun: ["ACTIVE", "CLOSE"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

help.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Help", help);
