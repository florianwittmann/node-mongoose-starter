const nodemailer = require("nodemailer");
const keys = require("../config/keys");

exports.send = function({ from, to, subject, text }) {
  var smtpTransport = nodemailer.createTransport({
    service: "SendGrid",
    auth: {
      user: keys.sendGridUserName,
      pass: keys.sendGridPassword
    }
  });
  var mailOptions = {
    to: to,
    from: from,
    subject: subject,
    text: text
  };
  return smtpTransport.sendMail(mailOptions);
};
