require("dotenv").config();
const express = require("express");
const app = express();
var session = require("express-session");
const cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
const routes = require("./backend/routes");
const { v4: uuidv4 } = require("uuid");
const port = 4000;

//init express packages
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser(process.env.SECRET));
app.use(
  session({
    genid: (req) => {
      const id = uuidv4();
      return id;
    },
    secret: process.env.SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false, expires: 60000 },
  })
);

var sessionChecker = (req, res, next) => {
  if (req.session.user && req.session.id) {
    res.redirect("/dashboard");
  } else {
    next();
  }
};

app.get("/", (req, res) => res.sendFile(__dirname + "/frontend/login.html"));
app.get("/create-account", (req, res) =>
  res.sendFile(__dirname + "/frontend/createuser.html")
);
app.get("/verify-user", routes.verifyUser);
app.post("/auth-user", routes.authUser);
app.post("/create-user", routes.createUser);
//dash board
app.get("/dashboard", (req, res) => {
  console.log(req.session);
  if (req.session.user && req.session.id) {
    res.sendFile(__dirname + "/frontend/index.html");
  } else {
    console.log("issue");
    res.redirect("/");
  }
});

app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);
