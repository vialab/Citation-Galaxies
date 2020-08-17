require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http");
const session = require("express-session");
const sharedsession = require("express-socket.io-session");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const userRoutes = require("./backend/userRoutes");
const apiRoutes = require("./backend/api");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const pgSession = require("connect-pg-simple")(session);
//const privateKey = fs.readFileSync("./backend/resources/key.pem", "utf8");
//const certificate = fs.readFileSync("./backend/resources/cert.pem", "utf8");
const port = 4000;

/******path routes *******/
const apiPath = "api";
const userPath = "user";
/**********initialize app***********/
const sessionMiddleware = session({
  genid: (req) => {
    const id = uuidv4();
    return id;
  },
  store: new pgSession({ conString: process.env.DB_AUTH_STRING }),
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, expires: 60000000 },
});
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 100000,
  })
);
app.use(bodyParser.json({ limit: "50mb" }));
app.use(cookieParser(process.env.SECRET));
app.use(sessionMiddleware);
//middleware to check that user has logged in. disregards any paths that include /${userPath}/
app.all("*", (req, res, next) => {
  if (req.path.includes(`/${userPath}/`)) {
    return next();
  }
  if (req.path === "/") {
    return next();
  }
  if (!(req.session.id && req.session.email)) {
    res.redirect("/");
    return;
  }
  return next();
});
/****************serving folders ******************/
app.use(express.static(__dirname + "/public"));
app.use(express.static(__dirname + "/frontend/css"));
app.use(express.static(__dirname + "/frontend/js"));
app.use(express.static(__dirname + "/frontend/favicon"));
app.use(
  "/scripts",
  express.static(__dirname + "/node_modules/html2canvas/dist")
);
/****************user routes ***************************/
app.get(`/${userPath}/create-account`, (req, res) =>
  res.sendFile(__dirname + "/frontend/html/createuser.html")
);
app.get(`/${userPath}/verify`, userRoutes.verifyUser);
app.post(`/${userPath}/auth`, userRoutes.authUser);
app.post(`/${userPath}/create`, userRoutes.createUser);
app.get(`/${userPath}/forgot-password`, (req, res) => {
  res.sendFile(__dirname + "/frontend/html/passwordrecovery.html");
});
app.post(`/${userPath}/recover`, userRoutes.recoverUser);
/***************page routes ****************************/
app.get("/", (req, res) =>
  res.sendFile(__dirname + "/frontend/html/login.html")
);
//dash board
app.get("/dashboard", (req, res) => {
  console.log(req.session);
  if (req.session.email && req.session.id) {
    res.sendFile(__dirname + "/frontend/html/index.html");
  } else {
    console.log("issue");
    res.redirect("/");
  }
});
/*************api routes *****************************/
app.get(`/${apiPath}/years`, apiRoutes.years);
app.post(`/${apiPath}/search`, apiRoutes.search);
app.post(`/${apiPath}/rule-search`, apiRoutes.ruleSearch);
app.post(`/${apiPath}/papers`, apiRoutes.getPapers);
app.get(`/${apiPath}/existing-work`, apiRoutes.checkExistingWork);
app.post(`/${apiPath}/delete-existing-work`, apiRoutes.deleteExistingWork);
app.get(`/${apiPath}/get-existing-work`, apiRoutes.loadExistingWork);
app.post(`/${apiPath}/paper`, apiRoutes.getPaper);
app.post(`/${apiPath}/rule-sets-table`, apiRoutes.loadRuleSets);
app.post(`/${apiPath}/rules-table`, apiRoutes.loadRules);
app.post(`/${apiPath}/delete/rules-table`, apiRoutes.deleteRule);
app.post(`/${apiPath}/update/rules-table`, apiRoutes.updateRule);
app.post(`/${apiPath}/insert/rule-sets-table`, apiRoutes.addRuleSet);
app.post(`/${apiPath}/insert/rules-table`, apiRoutes.addRule);
app.post(`/${apiPath}/delete/rule-sets-table`, apiRoutes.deleteRuleSet);
app.post(`/${apiPath}/update/rule-sets-table`, apiRoutes.updateRuleSet);
app.get(`/${apiPath}/export`, apiRoutes.exportData);
app.post(`/${apiPath}/paper/filter-suggestions`, apiRoutes.getFilterNames);
app.post(`/${apiPath}/paper/filter`, apiRoutes.getFilteredIDs);
app.get(`/${apiPath}/overview`, apiRoutes.getOverview);
app.get(`/${apiPath}/update/grid`, apiRoutes.updateGrid);
app.get(`/${apiPath}/get/grid`, apiRoutes.getGridVisualization);
app.post(`/${apiPath}/snapshot`, apiRoutes.submitSnapshot);
//const credentials = { key: privateKey, cert: certificate };
let httpServer = http.createServer(app);
//setup socket manager for server. this is used to communicate the progress of the complex queries.
const socketManager = require("./backend/socketManager");
socketManager.setServer(httpServer);
socketManager.setMiddleware(
  sharedsession(sessionMiddleware, cookieParser(process.env.SECRET))
);
//bind the clients socket id to the express-session this allows us to send messages from any http request
socketManager.on("connection", (socket) => {
  socket.handshake.session.socketId = socket.id;
  socket.handshake.session.save();
});
httpServer.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
