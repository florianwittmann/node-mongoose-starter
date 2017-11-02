const jwt = require("jwt-simple");
const User = require("../models/user");
const keys = require("../config/keys");
const crypto = require("crypto-promise");
const async = require("async");
const mail = require("../utils/mail");

function tokenForUser(user) {
  const timestamp = new Date().getTime();
  return jwt.encode({ sub: user.id, iat: timestamp }, keys.secret);
}

exports.login = function(req, res, next) {
  // User has already had their email and password auth'd
  // We just need to give them a token
  return res.send({ token: tokenForUser(req.user) });
};

exports.signup = async function(req, res, next) {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    return res
      .status(422)
      .send({ error: "You must provide email and password" });
  }

  try {
    // See if a user with the given email exists
    let existingUser = await User.findOne({ email: email });

    // If a user with email does exist, return an error
    if (existingUser) {
      return res.status(422).send({ error: "Email is in use" });
    }

    const user = new User({
      email: email,
      password: password
    });

    await user.save();

    // Respond to request indicating the user was created
    res.json({ token: tokenForUser(user) });
  } catch (error) {
    return next(error);
  }
};

exports.forgot = async function(req, res, next) {
  try {
    const tokenBuffer = await crypto.randomBytes(20);
    const token = tokenBuffer.toString("hex");

    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.json({ resetMail: "sent" });
    }

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    var mailOptions = {
      to: user.email,
      from: keys.serviceMail,
      subject: "Password Reset",
      text: "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
        "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
        keys.webRoot +
        "/reset/" +
        token +
        "\n\n" +
        "If you did not request this, please ignore this email and your password will remain unchanged.\n"
    };
    await mail.send(mailOptions);

    return res.json({ resetMail: "sent" });
  } catch (error) {
    return next(error);
  }
};

exports.reset = async function(req, res, next) {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(422).send({
        error: "Password reset token is invalid or has expired"
      });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();
    const token = tokenForUser(user);
    res.send({ token });

    var mailOptions = {
      to: user.email,
      from: keys.serviceMail,
      subject: "Your password has been changed",
      text: "Hello,\n\n" +
        "This is a confirmation that the password for your account " +
        user.email +
        " has just been changed.\n"
    };

    await mail.send(mailOptions);
  } catch (error) {
    return next(err);
  }
};
