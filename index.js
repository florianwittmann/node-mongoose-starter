const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const app = express();
const router = require("./router");
const mongoose = require("mongoose");
const cors = require("cors");
const keys = require("./config/keys");
// DB Setup
mongoose.connect(keys.mongoURI, {
  useMongoClient: true,
  promiseLibrary: global.Promise
});

//App Setup
app.use(morgan("combined"));
app.use(cors());
app.use(bodyParser.json({ type: "*/*" }));
router(app);

const port = process.env.PORT || 3090;
app.listen(port);
console.log("Server listening on port", port);
