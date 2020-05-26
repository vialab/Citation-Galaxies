require("dotenv").config();
const express = require("express");
const app = express();
var session = require("express-session");
const cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
const userRoutes = require("./backend/userRoutes");
const apiRoutes = require("./backend/api");
const { v4: uuidv4 } = require("uuid");
const port = 4000;

/******path routes *******/
const apiPath = "api";
const userPath = "user";
/**********initialize app***********/
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
/****************serving folders ******************/
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/frontend/css"));
app.use(express.static(__dirname + "/frontend/js"));
app.use(express.static(__dirname + "/frontend/favicon"));
/****************user routes ***************************/
app.get(`${userPath}/create`, (req, res) =>
  res.sendFile(__dirname + "/frontend/html/createuser.html")
);
app.get(`${userPath}/verify`, userRoutes.verifyUser);
app.post(`${userPath}/auth`, userRoutes.authUser);
app.post(`${userPath}/create`, userRoutes.createUser);
app.get(`${userPath}/forgot-password`, (req, res) => {
  res.sendFile(__dirname + "/frontend/html/passwordrecovery.html");
});
/***************page routes ****************************/
app.get("/", (req, res) =>
  res.sendFile(__dirname + "/frontend/html/login.html")
);
//dash board
app.get("/dashboard", (req, res) => {
  console.log(req.session);
  if (req.session.user && req.session.id) {
    res.sendFile(__dirname + "/frontend/html/index.html");
  } else {
    console.log("issue");
    res.redirect("/");
  }
});
/*************api routes *****************************/
app.get(`/${apiPath}/years`, apiRoutes.years);
app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);
