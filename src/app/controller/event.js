const mongoose = require("mongoose");
const Event = mongoose.model("Event");
const TicketBooking = mongoose.model("TicketBooking");
const response = require("./../responses");
const { findByIdAndUpdate } = require("../model/user");
const moment = require("moment");
const notification = require("../services/notification");
const mailNotification = require("./../services/mailNotification");
const userHelper = require("./../helper/user");

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

  getAllEventsByUser: async (req, res) => {
    try {
      const event = await Event.find({ posted_by: req.user.id });
      return response.ok(res, event);
    } catch (error) {
      return response.error(res, error);
    }
  },

  getAllEventsbyFilter: async (req, res) => {
    try {
      let d = moment(req.query.start, "MM/DD/YYYY").format();
      let de = moment(req.query.end, "MM/DD/YYYY").format();
      console.log(d, de);
      let cond = { $gte: d, $lt: de };
      const events = await Event.find({
        posted_by: req.user.id,
        start_date: cond,
      })
        .sort({ start_date: 1 })
        .lean();
      return response.ok(res, { d, de, events });
    } catch (error) {
      return response.error(res, error);
    }
  },

  getAllEventsforDashBoard: async (req, res) => {
    try {
      const count = await Event.count({ posted_by: req.user.id });
      const tick = await TicketBooking.find().populate("event_id");
      const book = tick.filter(
        (f) => f.event_id?.posted_by.toString() === req.user.id.toString()
      );
      let summary = {
        event: count,
        tickets: 0,
        balance: 0,
        customer: [],
      };
      book.map((f) => {
        // if (f.event_id?.posted_by.toString() === req.user.id.toString()) {
        summary.tickets = summary.tickets + Number(f.qty);
        summary.balance = summary.balance + Number(f.total);
        if (!summary.customer.includes(f.booked_by)) {
          summary.customer.push(f.booked_by);
        }
        // }
      });
      let d = moment(req.query.start, "YYYY/MM/DD").format();
      let de = moment(req.query.end, "YYYY/MM/DD").format();
      let cond = { $gte: d, $lt: de };
      const events = await Event.find({
        posted_by: req.user.id,
        start_date: cond,
      })
        .sort({ start_date: 1 })
        .lean();
      return response.ok(res, { events, summary, book });
    } catch (error) {
      return response.error(res, error);
    }
  },

  getSimilierEvent: async (req, res) => {
    try {
      const event = await Event.find({ posted_by: req?.params?.id });
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

  globalSearchEvents: async (req, res) => {
    try {
      let q = req?.query;
      let cond = {};
      if (q.category) {
        cond.type_of_event = q.category;
      }
      if (q.location) {
        cond.city = q.location;
      }
      if (q.start && !q.end) {
        let d = moment(req.query.start, "YYYY/MM/DD").format();

        cond.start_date = { $gte: d };
      }
      if (!q.start && q.end) {
        let de = moment(req.query.end, "YYYY/MM/DD").format();
        cond.start_date = { $lt: de };
      }
      if (q.start && q.end) {
        let d = moment(req.query.start, "YYYY/MM/DD").format();
        let de = moment(req.query.end, "YYYY/MM/DD").format();
        cond.start_date = { $gte: d, $lt: de };
      }

      const event = await Event.find(cond).populate(
        "posted_by",
        "firstname lastname email"
      );

      return response.ok(res, event);
    } catch (error) {
      return response.error(res, error);
    }
  },

  updtaeEvent: async (req, res) => {
    try {
      const payload = req?.body || {};
      let event = await Event.findByIdAndUpdate(
        req?.params?.event_id,
        payload,
        {
          new: true,
          upsert: true,
        }
      );
      return response.ok(res, event);
    } catch (error) {
      return response.error(res, error);
    }
  },

  createBookig: async (req, res) => {
    try {
      const payload = req?.body || {};
      const user = await userHelper.find({ _id: req?.user.id });
      console.log(user);
      payload.booked_by = req?.user.id;
      let book = new TicketBooking(payload);
      const ev = await book.save();
      const eventbook = await TicketBooking.findById({ _id: ev._id }).populate(
        "event_id"
      );
      await mailNotification.ConfirmBooking({
        user,
        event: eventbook,
      });

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
    console.log(req);
    try {
      let book = await TicketBooking.find({ booked_by: req?.user.id }).populate(
        "event_id"
      );
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
