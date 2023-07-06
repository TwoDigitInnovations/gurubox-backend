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
    name_on_ticket: {
      type: String,
    },
    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
    qty: {
      type: Number,
    },
    total: {
      type: Number,
    },
    bookingfee: {
      type: Number,
    },
    deliveryfee: {
      type: Number,
    },
    discount: {
      type: Number,
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
    country: {
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
    agree_terms: {
      type: Boolean,
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
