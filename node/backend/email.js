const nodeMailer = require("nodemailer");
/**
 *  This is responsible for sending emails. Currently only used for account creation.
 */

const transporter = nodeMailer.createTransport({
  host: "smtp." + process.env.SERVICE + ".com",
  secure: true,
  port: 465,
  auth: {
    user: process.env.VIA_EMAIL,
    pass: process.env.VIA_EMAIL_PASSWORD,
  },
});

/**
 *
 * @param {{to:string, subject:string, text:string}} mailOptions
 * @param {function(err,info)} errorCallback
 */
const sendMail = (mailOptions, errorCallback = null) => {
  const sendOptions = {
    from: process.env.SERVICE,
    to: mailOptions.to,
    subject: mailOptions.subject,
    text: mailOptions.text,
  };
  if (errorCallback != null) {
    transporter.sendMail(sendOptions, errorCallback);
  } else {
    transporter.sendMail(sendOptions, null);
  }
};

module.exports = { sendMail };
