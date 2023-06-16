"use strict";

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["Point"],
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
  },
});
const bankSchema = new mongoose.Schema({
  account: {
    type: String,
    required: true,
    default: "",
  },
  name: {
    type: String,
    default: "",
  },
  code: {
    type: String,
    default: "",
  },
});
const organizationSchema = new mongoose.Schema(
  {
    org_id: {
      type: String,
      trim: true,
      require: true,
    },
    public_email: {
      type: String,
    },
    number: {
      type: String,
    },
    about_you: {
      type: String,
    },
    website: {
      type: String,
    },
    logo: {
      type: String,
    },
    banner: {
      type: String,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);
organizationSchema.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});

organizationSchema.methods.encryptPassword = (password) => {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
};
organizationSchema.methods.isValidPassword = function isValidPassword(
  password
) {
  return bcrypt.compareSync(password, this.password);
};
module.exports = mongoose.model("Organization", organizationSchema);
