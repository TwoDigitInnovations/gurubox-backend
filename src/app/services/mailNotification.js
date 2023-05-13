const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});
const sendMail = async (to, subject, html) => {
    return new Promise((resolve, reject) => {
        const mailConfigurations = {
            from: process.env.MAIL_USER,
            to, subject, html
        };
        transporter.sendMail(mailConfigurations, function (error, info) {
            if (error) return reject(error);
            return resolve(info)
        });
    })
}

module.exports = {

    welcomeMail: async (details) => {
        const html = `<div> \r\n<p>Hello,<\/p>\r\n\r\n<p> Welcome to SwiftGuard. <\/p>\r\n\r\n<p>You recently created a SwiftGuard Account. <\/p>\r\n\r\n<p>Your SwiftGuard Registered Mail is: <b>${details.email} <\/b><\/p>\r\n\r\n<p><\/br>Thanks,<\/p>\r\n\r\n<p><b>The SwiftGuard Account Team<\/b><\/p>\r\n<\/div>`
        await sendMail(details.email, 'Welcome to SwiftGuard', html);
    },
    sendOTPmail: async ({ email, code }) => {
        try {
            const html = `<div> \r\n<p>Password Reset Instructions<\/p>\r\n\r\n<p>Your SwiftGuard One-Time password reset code is: ${code}. Enter online when prompted. This passcode will expire in 5 minutes<\/p><\/br>Thank you for updating your password.<\/p>\r\n\r\n<p><b>SwiftGuard<\/b><\/p>\r\n<\/div>`
            return await sendMail(email, 'Password Reset Instructions', html);
        } catch (err) {
            console.log(err);
            throw new Error('[sendOTPmail]Could not send OTP mail');
        }
    },
    passwordChange: async ({ email }) => {
        try {
            const html = `<div> Your password has been reset, if you didn't update your password, please call us on (.) between 9am - 5pm Monday to Friday. \r\n\r\nSwiftGuard  </div>`;
            return await sendMail(email, 'PASSWORD RESET NOTIFICATION EMAIL', html);
        } catch (err) {
            console.log(err);
            throw new Error('[passwordChange]Could not send OTP mail');
        }
    }
}

