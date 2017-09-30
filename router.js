const Authentification = require("./controllers/authentification");

const passportService = require("./services/passport");
const passport = require("passport");

const requireAuth = passport.authenticate("jwt", { session: false });
const requireSignin = passport.authenticate("local", { session: false });

const restrictToAdmins = function(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== "admin") {
      return res.status(401).send({
        error: "Forbidden :("
      });
    }
    next();
  });
};

module.exports = function(app) {
  app.get("/", requireAuth, function(req, res) {
    res.send({ hi: "there" });
  });

  app.post("/user/login", requireSignin, Authentification.login);
  app.post("/user/signup", Authentification.signup);
  app.post("/user/reset/:token", Authentification.reset);
  app.post("/user/reset", Authentification.forgot);
};
