const mongoose = require("mongoose");
const Event = mongoose.model("Event");
const TicketBooking = mongoose.model("TicketBooking");
const response = require("./../responses");
const { findByIdAndUpdate } = require("../model/user");

module.exports = {
  create: async (req, res) => {
    try {
      const payload = req?.body || {};
      payload.posted_by = req?.user?.id;
      let event = new Event(payload);
      const ev = await event.save();
      return response.ok(res, { event: ev, message: "Event created!" });
    } catch (error) {
      return response.error(res, error);
    }
  },

  getAllEvents: async (req, res) => {
    try {
      const event = await Event.find();
      return response.ok(res, event);
    } catch (error) {
      return response.error(res, error);
    }
  },

  getEventById: async (req, res) => {
    try {
      const event = await Event.findById(req?.params?.event_id).populate(
        "posted_by",
        "firstname lastname email"
      );
      return response.ok(res, event);
    } catch (error) {
      return response.error(res, error);
    }
  },

  createBookig: async (req, res) => {
    try {
      const payload = req?.body || {};
      payload.booked_by = req?.user.id;
      let book = new TicketBooking(payload);
      const ev = await book.save();
      return response.ok(res, { book: ev, message: "Booking created!" });
    } catch (error) {
      return response.error(res, error);
    }
  },

  updateBookig: async (req, res) => {
    try {
      const payload = req?.body || {};
      let book = await TicketBooking.findByIdAndUpdate(
        req?.params?.book_id,
        payload
      );
      return response.ok(res, { message: "Booking updated!" });
    } catch (error) {
      return response.error(res, error);
    }
  },

  getBooking: async (req, res) => {
    try {
      let book = await TicketBooking.find();
      return response.ok(res, book);
    } catch (error) {
      return response.error(res, error);
    }
  },

  getBookingByUser: async (req, res) => {
    try {
      let book = await TicketBooking.find({ booked_by: req?.user.id });
      return response.ok(res, book);
    } catch (error) {
      return response.error(res, error);
    }
  },

  getBookingById: async (req, res) => {
    try {
      let book = await TicketBooking.findById(req?.params?.book_id);
      return response.ok(res, book);
    } catch (error) {
      return response.error(res, error);
    }
  },
  deleteBoking: async (req, res) => {
    try {
      await TicketBooking.findByIdAndDelete(req?.params?.book_id);
      return response.ok(res, { message: "Deleted successfully" });
    } catch (error) {
      return response.error(res, error);
    }
  },
};
