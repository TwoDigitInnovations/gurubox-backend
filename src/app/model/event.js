"use strict";
const mongoose = require("mongoose");
const event = new mongoose.Schema(
  {
    start_date: {
      type: Date,
    },
    end_date: {
      type: Date,
    },
    name: {
      type: String,
    },
    address: {
      type: String,
    },
    lat: {
      type: String,
    },
    long: {
      type: String,
    },
    capacity: {
      type: String,
    },
    image: {
      type: String,
    },
    amount: {
      type: String,
    },
    details: {
      type: Object,
    },
    city: {
      type: String,
    },
    posted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

event.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Event", event);
