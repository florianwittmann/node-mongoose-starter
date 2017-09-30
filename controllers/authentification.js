const jwt = require("jwt-simple");
const User = require("../models/user");
const keys = require("../config/keys");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const async = require("async");

function tokenForUser(user) {
  const timestamp = new Date().getTime();
  return jwt.encode({ sub: user.id, iat: timestamp }, keys.secret);
}

exports.login = function(req, res, next) {
  // User has already had their email and password auth'd
  // We just need to give them a token
  return res.send({ token: tokenForUser(req.user) });
};

exports.signup = function(req, res, next) {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    return res
      .status(422)
      .send({ error: "You must provide email and password" });
  }

  // See if a user with the given email exists
  User.findOne({ email: email }, function(err, existingUser) {
    if (err) {
      return next(err);
    }

    // If a user with email does exist, return an error
    if (existingUser) {
      return res.status(422).send({ error: "Email is in use" });
    }

    const user = new User({
      email: email,
      password: password
    });

    user.save(function(err) {
      if (err) {
        return next(err);
      }

      // Respond to request indicating the user was created
      res.json({ token: tokenForUser(user) });
    });
  });
};

exports.forgot = function(req, res, next) {
  async.waterfall(
    [
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString("hex");
          done(err, token);
        });
      },
      function(token, done) {
        User.findOne({ email: req.body.email }, function(err, user) {
          if (!user) {
            return res.json({ resetMail: "sent" });
          }

          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

          user.save(function(err) {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: "SendGrid",
          auth: {
            user: keys.sendGridUserName,
            pass: keys.sendGridPassword
          }
        });
        var mailOptions = {
          to: user.email,
          from: keys.serviceEmail,
          subject: "Password Reset",
          text: "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
            "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
            keys.webRoot +
            "/reset/" +
            token +
            "\n\n" +
            "If you did not request this, please ignore this email and your password will remain unchanged.\n"
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          res.json({ resetMail: "sent" });
          done(err, "done");
        });
      }
    ],
    function(err) {
      if (err) return next(err);
    }
  );
};

exports.reset = function(req, res, next) {
  async.waterfall(
    [
      function(done) {
        User.findOne(
          {
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
          },
          function(err, user) {
            if (!user) {
              return res.status(422).send({
                error: "Password reset token is invalid or has expired"
              });
            }

            user.password = req.body.password;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              res.send({ token: tokenForUser(user) });
              done(err, user);
            });
          }
        );
      },
      function(user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: "SendGrid",
          auth: {
            user: keys.sendGridUserName,
            pass: keys.sendGridPassword
          }
        });
        var mailOptions = {
          to: user.email,
          from: keys.serviceEmail,
          subject: "Your password has been changed",
          text: "Hello,\n\n" +
            "This is a confirmation that the password for your account " +
            user.email +
            " has just been changed.\n"
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          done(err);
        });
      }
    ],
    function(err) {
      if (err) return next(err);
    }
  );
};
