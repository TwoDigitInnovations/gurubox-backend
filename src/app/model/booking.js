"use strict";
const mongoose = require("mongoose");
// const ticketBooking = new mongoose.Schema({
//     type: {
//         type: String,
//         enum: ['Point'],
//         required: true
//     },
//     coordinates: {
//         type: [Number],
//         required: true
//     }
// });

const ticketBooking = new mongoose.Schema(
  {
    title: {
      type: String,
    },
    price: {
      type: Number,
    },
    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
    qty: {
      type: String,
    },
    total: {
      type: String,
    },
    bookingfee: {
      type: String,
    },
    deliveryfee: {
      type: String,
    },
    discount: {
      type: String,
    },
    address1: {
      type: String,
    },
    address2: {
      type: String,
    },
    city: {
      type: String,
    },
    zip: {
      type: String,
    },
    card: {
      type: Object,
    },
    booked_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

ticketBooking.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});
ticketBooking.index({ location: "2dsphere" });

module.exports = mongoose.model("TicketBooking", ticketBooking);
