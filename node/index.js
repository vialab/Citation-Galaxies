require("dotenv").config();
const express = require("express");
const app = express();
var session = require("express-session");
var bodyParser = require("body-parser");
const routes = require("./backend/routes");
const port = 4000;

//init express packages
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true, expires: 60000 },
  })
);

app.get("/", (req, res) => res.sendFile(__dirname + "/frontend/login.html"));
app.get("/create-account", (req, res) =>
  res.sendFile(__dirname + "/frontend/createuser.html")
);
app.get("/verify-user", routes.verifyUser);

app.post("/auth-user", routes.authUser);
app.post("/create-user", routes.createUser);

app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`)
);
