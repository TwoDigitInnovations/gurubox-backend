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
const userSchema = new mongoose.Schema(
  {
    org_id: {
      type: String,
      trim: true,
      unique: true,
    },
    firstname: {
      type: String,
    },
    lastname: {
      type: String,
    },
    address: {
      type: String,
    },
    country: {
      type: String,
    },
    email: {
      type: String,
      trim: true,
      unique: true,
    },
    password: {
      type: String,
    },
    type: {
      type: String,
      enum: ["USER", "ADMIN", "ORG"],
      default: "USER",
    },
    city: {
      type: String,
    },
    zip: {
      type: String,
    },
    mobileNumber: {
      type: String,
    },
    public_email: {
      type: String,
    },
    public_number: {
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
  },
  {
    timestamps: true,
  }
);
userSchema.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: (doc, ret, options) => {
    delete ret.__v;
    return ret;
  },
});

userSchema.methods.encryptPassword = (password) => {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
};
userSchema.methods.isValidPassword = function isValidPassword(password) {
  return bcrypt.compareSync(password, this.password);
};
module.exports = mongoose.model("User", userSchema);
