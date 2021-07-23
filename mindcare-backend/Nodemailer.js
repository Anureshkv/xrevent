const nodemailer = require("nodemailer");

const mailer = (transport, mailOptions) => {
  transport.sendMail(mailOptions, (err, info) => {
    if (err) {
      return console.log(err);
    }
    console.log("Email Sent!", info);
  });
};
module.exports = mailer;