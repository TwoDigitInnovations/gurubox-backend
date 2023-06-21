const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const Notification = mongoose.model("Notification");
const moment = require("moment");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});
const sendMail = async (to, subject, html) => {
  return new Promise((resolve, reject) => {
    const mailConfigurations = {
      from: process.env.MAIL_USER,
      to,
      subject,
      html,
    };
    console.log(mailConfigurations);
    transporter.sendMail(mailConfigurations, function (error, info) {
      if (error) return reject(error);
      return resolve(info);
    });
  });
};

module.exports = {
  welcomeMail: async (details) => {
    const html = `<div> \r\n<p>Hello,<\/p>\r\n\r\n<p> Welcome to SwiftGuard. <\/p>\r\n\r\n<p>You recently created a SwiftGuard Account. <\/p>\r\n\r\n<p>Your SwiftGuard Registered Mail is: <b>${details.email} <\/b><\/p>\r\n\r\n<p><\/br>Thanks,<\/p>\r\n\r\n<p><b>The SwiftGuard Account Team<\/b><\/p>\r\n<\/div>`;
    await sendMail(details.email, "Welcome to SwiftGuard", html);
  },
  sendOTPmail: async ({ email, code }) => {
    try {
      const html = `<div> \r\n<p>Password Reset Instructions<\/p>\r\n\r\n<p>Your SwiftGuard One-Time password reset code is: ${code}. Enter online when prompted. This passcode will expire in 5 minutes<\/p><\/br>Thank you for updating your password.<\/p>\r\n\r\n<p><b>SwiftGuard<\/b><\/p>\r\n<\/div>`;
      return await sendMail(email, "Password Reset Instructions", html);
    } catch (err) {
      console.log(err);
      throw new Error("[sendOTPmail]Could not send OTP mail");
    }
  },
  passwordChange: async ({ email }) => {
    try {
      const html = `<div> Your password has been reset, if you didn't update your password, please call us on (.) between 9am - 5pm Monday to Friday. \r\n\r\nSwiftGuard  </div>`;
      return await sendMail(email, "PASSWORD RESET NOTIFICATION EMAIL", html);
    } catch (err) {
      console.log(err);
      throw new Error("[passwordChange]Could not send OTP mail");
    }
  },
  ConfirmBooking: async ({ user, event }) => {
    try {
      const notObj = {
        user: user._id,
        message: "Your event booking has been comfirmed",
        event: event.event_id._id,
      };
      console.log(notObj);
      // if (job) notObj.invited_for = job;
      await Notification.create(notObj);
      const html = `<div>\r\n<h1>Dear ${user.firstname} ${
        user.lastname
      }.</h1>\r\n\r\n<h3>We are thrilled to confirm your ticket booking for ${
        event.event_id.name
      }. Here are the details:</h3> \r\n<p>Event: ${
        event.event_id.name
      }</p><p style="margin:0px;">Date: ${moment(
        event.event_id.start_date
      ).format("DD/MM/YYYY,hh:mm A")}</p><p>Quantity: ${
        event.qty
      }</p>\r\n\r\n<p>Your tickets will be sent to you via email as PDF attachments closer to the event date. Remember to bring a valid ID matching the ticket name for smooth entry.</p>\r\n\r\n<p>If you have any questions, please reach out to our customer support team at [Customer Support Contact Details].<p/>\r\n\r\n<p>Thank you for choosing our platform. We can't wait to see you at ${
        event.event_id.name
      }!</p>\r\n\r\n<p>Best regards,</p>\r\n\r\n<h4>Gurubox</h4></div>`;
      return await sendMail(
        user.email,
        `Ticket Confirmation for ${event.event_id.name}`,
        html
      );
    } catch (err) {
      console.log(err);
      throw new Error("Something went wrong");
    }
  },
};
