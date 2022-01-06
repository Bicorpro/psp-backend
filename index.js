// Node dependencies
const axios = require("axios");
const fs = require("fs");

const express = require("express");
const bodyParser = require("body-parser");
var session = require("express-session");

const bcrypt = require("bcrypt");

// Local dependencies
const validator = require("./validator.js");
const nv = require("./novlog.js");

// Load configuration and data files
const config = require("./config.json");
const db_users = require("./data/users.json");
const db_devices = require("./data/devices.json");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// Use the session middleware
app.use(
  session({
    secret: config.secret,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1800000 }, // 1800000 is equal to 30 minutes before a cookie expires
  })
);

// !insecure way : deactivating certificate checks
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

// proper way to allow CampusIot -> download SSL certificate
//require("https").globalAgent.options.ca = require("ssl-root-cas/latest").create();

// Get JWT token asynchronously
// ! Since it takes a little bit of time to get the JWT, it is better to wait a little bit before issuing any API method (especially ones involving the LoRaWan server)
let JWT_TOKEN;
getJWT().then((data) => {
  JWT_TOKEN = data;
});

app.get("/", (req, res) => {
  nv.log(req);
  res.send("Hello World! Go to /api to use the api");
});

app.get("/api", (req, res) => {
  nv.log(req);
  let msg = "The API is up and running!<br/>Supported methods are:<br/>";
  msg += "POST /api/users/register<br/>";
  msg += "...<br/>";
  res.send(msg);
});

/**
 * @api [post] /api/users/register
 * description: "Creates a new user in the database matching the information given by the user"
 * parameters:
 *  - (query) username  {String} The username of the user
 *  - (query) email     {String} The email adress of the user
 *  - (query) password  {String} The password of the user
 * responses:
 *  200:
 *    description: The user has been succesfully registered
 *  400:
 *    description: The user could not be registered
 */
app.post("/api/users/register", (req, res) => {
  nv.log(req);
  // Get username, email and password from POST body
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;

  // Validate the form information entered by the user
  validator.validateUserRegisterForm(username, email, password, (err) => {
    // if the form information is invalid, send the error to the frontend
    if (err) {
      res.status(400).json({
        status: "ERROR",
        error: err,
      });
      return;
    }

    if (db_users.find((user) => user.username === username)) {
      res.status(400).json({
        status: "ERROR",
        error: "Username already taken",
      });
      return;
    }

    if (db_users.find((user) => user.email === email)) {
      res.status(400).json({
        status: "ERROR",
        error: "Email already in use",
      });
      return;
    }

    bcrypt.genSalt(config.saltRounds, function (err, salt) {
      if (err) {
        console.log(err);
        return;
      }

      bcrypt.hash(password, salt, function (err, hash) {
        if (err) {
          console.log(err);
          res.status(400).json({
            status: "ERROR",
            error: "Unknown error during registration",
          });
          return;
        }

        // create the new user
        const niu = {
          username: username,
          email: email,
          password: hash,
          devices: [],
        };
        db_users.push(niu);

        writeJSONToFile(db_users, "./data/users.json");
      });
    });

    res.status(200).json({
      status: "OK",
    });
  });
});

app.post("/api/users/authenticate", (req, res) => {
  nv.log(req);
  const username = req.body.username;
  const password = req.body.password;

  const user = db_users.find(
    (usr) => usr.username === username || usr.email === username
  );

  if (!user) {
    res.status(400).json({
      status: "ERROR",
      error: "Invalid login",
    });
    return;
  }

  // Load hash from your password DB.
  bcrypt.compare(password, user.password, function (err, result) {
    if (result) {
      req.session.user = user.username;
      res.status(200).json({
        status: "OK",
      });
    } else {
      res.status(400).json({
        status: "ERROR",
        error: "Invalid login",
      });
    }
  });
});

/**
 * How likely is it that an attacker making API calls with all possible eid
 * manage to register random device on the globe? We need to address this problem:
 * - Notify all users who have registered a device when a new user registers it
 * - Secure each device with a factory password to decrease the likeliness of random guessing
 * - Limit API usage to prevent a user from making thousands of calls per second
 * - Let it be as is (Since there are 16^16 possibles EIDs, it should take an average computer 500 years to try them all)
 */
app.post("/api/devices/:eid([0-9a-fA-F]{16})", (req, res) => {
  nv.log(req);

  if (!req.session.user) {
    res.status(401).json({
      status: "ERROR",
      error: "Authentication required",
    });
    return;
  }

  const user = db_users.find((usr) => usr.username === req.session.user);

  if (!user) {
    // TODO: I dunno what to do, this should never happen
    res.status(456).json({
      status: "ERROR",
      error: "Database got corrupted, please contact an administrator",
    });
    return;
  }

  const eid = req.params.eid;

  if (!validator.isEIDValid(eid)) {
    res.status(400).json({
      status: "ERROR",
      error: "EID format invalid",
    });
    return;
  }

  if (user.devices.find((devEID) => devEID === eid)) {
    res.status(400).json({
      status: "ERROR",
      error: "Device already registered",
    });
    return;
  }

  axios
    .get(`${config.LoRaWan.endpoint.host}/devices/${eid}`, {
      headers: { "Grpc-Metadata-Authorization": `Bearer ${JWT_TOKEN}` },
    })
    .then(() => {
      user.devices.push(eid);
      writeJSONToFile(db_users, "./data/users.json");

      let device = db_devices.find((dev) => dev.eid === eid);

      if (!device) {
        db_devices.push({
          eid: eid,
          owners: [user.username],
          positions: [],
        });
      } else {
        device.owners.push(user.username);
      }
      writeJSONToFile(db_devices, "./data/devices.json");
      res.status(200).json({
        status: "OK",
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(400).json({
        status: "ERROR",
        error: "Device could not be registered",
      });
    });

  // retrieve user from cookie
  // check if device is a valid tracker
  // check if device has not already been registered by a user
  // eventually protect devices with default password that can be changed to prevent a user to re-register a device that is not their own
  // if device and user are legitimate, return success
});

app.delete("/api/devices/:eid([0-9a-fA-F]{16})", (req, res) => {
  nv.log(req);

  if (!req.session.user) {
    res.status(401).json({
      status: "ERROR",
      error: "Authentication required",
    });
    return;
  }

  const user = db_users.find((usr) => usr.username === req.session.user);

  if (!user) {
    // TODO: I dunno what to do, this should never happen
    res.status(456).json({
      status: "ERROR",
      error: "Database got corrupted, please contact an administrator",
    });
    return;
  }

  const eid = req.params.eid;

  if (!validator.isEIDValid(eid)) {
    res.status(400).json({
      status: "ERROR",
      error: "EID format invalid",
    });
    return;
  }

  if (!user.devices.find((devEID) => devEID === eid)) {
    res.status(400).json({
      status: "ERROR",
      error: "Device has not been registered",
    });
    return;
  }

  user.devices = user.devices.filter((devEID) => devEID !== eid);
  writeJSONToFile(db_users, "./data/users.json");

  let device = db_devices.find((dev) => dev.eid === eid);

  if (!device) {
    // TODO: I dunno what to do, this should never happen
    res.status(456).json({
      status: "ERROR",
      error: "Database got corrupted, please contact an administrator",
    });
    return;
  } else {
    device.owners = device.owners.filter((usr) => usr !== user.username);
  }
  writeJSONToFile(db_devices, "./data/devices.json");
  res.status(200).json({
    status: "OK",
  });
});

app.get("/api/devices", (req, res) => {
  nv.log(req);

  if (!req.session.user) {
    res.status(401).json({
      status: "ERROR",
      error: "Authentication required",
    });
    return;
  }

  const user = db_users.find((usr) => usr.username === req.session.user);

  if (!user) {
    // TODO: I dunno what to do, this should never happen
    res.status(456).json({
      status: "ERROR",
      error: "Database got corrupted, please contact an administrator",
    });
    return;
  }

  res.status(200).json({
    devices: user.devices,
  });
});

app.get("/api/devices/:eid([0-9a-fA-F]{16})", (req, res) => {
  nv.log(req);

  // TODO: Make sure user is authenticated
  if (false && !req.session.user) {
    res.status(401).json({
      status: "ERROR",
      error: "Authentication required",
    });
    return;
  }

  const eid = req.params.eid;

  axios
    .get(`${config.LoRaWan.endpoint.host}/devices/${eid}`, {
      headers: { "Grpc-Metadata-Authorization": `Bearer ${JWT_TOKEN}` },
    })
    .then((res2) => {
      console.log(res2);
      res.send(res2.data.device.description);
    })
    .catch((err) => {
      console.log(err);
      res.send("An error occured");
    });
});

app.use(function (req, res) {
  nv.log(req);
  res.status(404).json({
    status: "ERROR",
    error: "Page not found",
  });
});

app.listen(config.port, () => {
  console.log(`psp-backend listening at http://localhost:${config.port}`);
});

function getJWT() {
  // POST request to LoRaWan endpoint with group credentials to obtain a valid JWT
  return axios
    .post(
      config.LoRaWan.endpoint.host + "/internal/login",
      config.LoRaWan.endpoint.credentials
    )
    .then((res) => {
      console.log(`JWT token successfully retrieved: ${res.data.jwt}`);
      return res.data.jwt;
    })
    .catch((error) => {
      console.error(error);
      return null;
    });
}

function writeJSONToFile(obj, path) {
  // Convert JSON object to a string
  const data = JSON.stringify(obj);

  // Attempt to write file to disk
  fs.writeFile(path, data, "utf8", (err) => {
    if (err) {
      console.error(`Error writing data to ${path}: ${err}`);
    } else {
      console.log(`Successfully updated data in ${path}!`);
    }
  });
}
