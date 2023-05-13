const mongoose = require("mongoose");
const Event = mongoose.model("Event");
const response = require("./../responses");

module.exports = {
  create: async (req, res) => {
    const payload = req?.body || {};
    let event = new Event(payload);
    const ev = await event.save();
    return response.ok(res, { event: ev, message: "Event created!" });
  },

  getAllEvents: async (req, res) => {
    const event = await Event.find();
    return response.ok(res, event);
  },
};
