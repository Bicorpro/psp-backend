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
const credentials = require("./credentials.json");
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
  nv.request(req);
  res.send("Hello World! Go to /api to use the api");
});

app.get("/api", (req, res) => {
  nv.request(req);
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
  nv.request(req);
  // Get username, email and password from POST body
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;

  // Validate the form information entered by the user
  validator.validateUserRegisterForm(username, email, password, (err) => {
    // if the form information is invalid, send the error to the frontend
    if (err) {
      nv.info(`Register form error: ${err}`);
      res.status(400).json({
        status: "ERROR",
        error: err,
      });
      return;
    }

    if (db_users.find((user) => user.username === username)) {
      nv.info("Register form error: Username already taken");
      res.status(400).json({
        status: "ERROR",
        error: "Username already taken",
      });
      return;
    }

    if (db_users.find((user) => user.email === email)) {
      nv.info("Register form error: Email already in use");
      res.status(400).json({
        status: "ERROR",
        error: "Email already in use",
      });
      return;
    }

    bcrypt.genSalt(config.saltRounds, function (err, salt) {
      if (err) {
        nv.error(err);
        return;
      }

      bcrypt.hash(password, salt, function (err, hash) {
        if (err) {
          nv.error(err);
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

    nv.info(`User ${username} successfully registered`);
    res.status(200).json({
      status: "OK",
    });
  });
});

app.post("/api/users/authenticate", (req, res) => {
  nv.request(req);
  const username = req.body.username;
  const password = req.body.password;

  const user = db_users.find(
    (usr) => usr.username === username || usr.email === username
  );

  if (!user) {
    nv.info(`Unregistered user ${username} attempted to login`);
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
      nv.info(`Successfull authentication for ${username}`);
      res.status(200).json({
        status: "OK",
      });
    } else {
      nv.error(err);
      res.status(400).json({
        status: "ERROR",
        error: "Invalid login",
      });
    }
  });
});

/**
 * How likely is it that an attacker making API calls with all possible EUIs
 * manage to register random device on the globe? We need to address this problem:
 * - Notify all users who have registered a device when a new user registers it
 * - Secure each device with a factory password to decrease the likeliness of random guessing
 * - Limit API usage to prevent a user from making thousands of calls per second
 * - Let it be as is (Since there are 16^16 possibles EUIs, it should take an average computer 500 years to try them all)
 */
app.post("/api/devices/:eui([0-9a-fA-F]{16})", (req, res) => {
  nv.request(req);

  if (!verifyAuthentication(req, res)) return;

  const user = db_users.find((usr) => usr.username === req.session.user);

  if (!user) {
    // TODO: I dunno what to do, this should never happen
    nv.error(
      "Database corruption: previously authenticated user is no longer a valid user"
    );
    res.status(456).json({
      status: "ERROR",
      error: "Database got corrupted, please contact an administrator",
    });
    return;
  }

  const eui = req.params.eui;

  // TODO: Not sure this check is relevant since Express already filters the route based on a regex
  if (!validator.isEUIValid(eui)) {
    res.status(400).json({
      status: "ERROR",
      error: "EUI format invalid",
    });
    return;
  }

  if (user.devices.find((devEUI) => devEUI === eui)) {
    nv.info(`Device ${eui} already registered by ${user.username}`);
    res.status(400).json({
      status: "ERROR",
      error: "Device already registered",
    });
    return;
  }

  axios
    .get(`${config.LoRaWan.endpoint.host}/devices/${eui}`, {
      headers: { "Grpc-Metadata-Authorization": `Bearer ${JWT_TOKEN}` },
    })
    .then(() => {
      user.devices.push(eui);
      writeJSONToFile(db_users, "./data/users.json");

      let device = db_devices.find((dev) => dev.eui === eui);

      if (!device) {
        db_devices.push({
          eui: eui,
          owners: [user.username],
          positions: [],
        });
      } else {
        device.owners.push(user.username);
      }
      writeJSONToFile(db_devices, "./data/devices.json");
      nv.info(`Device ${eui} successfully registered by ${user.username}`);
      res.status(200).json({
        status: "OK",
      });
    })
    .catch((err) => {
      nv.error(err);
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

app.delete("/api/devices/:eui([0-9a-fA-F]{16})", (req, res) => {
  nv.request(req);

  if (!verifyAuthentication(req, res)) return;

  const user = db_users.find((usr) => usr.username === req.session.user);

  if (!user) {
    // TODO: I dunno what to do, this should never happen
    nv.error(
      "Database corruption: previously authenticated user is no longer a valid user"
    );
    res.status(456).json({
      status: "ERROR",
      error: "Database got corrupted, please contact an administrator",
    });
    return;
  }

  const eui = req.params.eui;

  // TODO: Not sure this check is relevant since Express already filters the route based on a regex
  if (!validator.isEUIValid(eui)) {
    res.status(400).json({
      status: "ERROR",
      error: "EUI format invalid",
    });
    return;
  }

  if (!user.devices.find((devEUI) => devEUI === eui)) {
    nv.info(`Device ${eui} not registered by ${user.username}`);
    res.status(400).json({
      status: "ERROR",
      error: "Device has not been registered",
    });
    return;
  }

  user.devices = user.devices.filter((devEUI) => devEUI !== eui);
  writeJSONToFile(db_users, "./data/users.json");

  let device = db_devices.find((dev) => dev.eui === eui);

  if (!device) {
    // TODO: I dunno what to do, this should never happen
    nv.error(
      "Database corruption: previously registered device is no longer a valid device"
    );
    res.status(456).json({
      status: "ERROR",
      error: "Database got corrupted, please contact an administrator",
    });
    return;
  } else {
    device.owners = device.owners.filter((usr) => usr !== user.username);
  }
  writeJSONToFile(db_devices, "./data/devices.json");
  nv.info(`Device ${eui} successfully deleted for ${user.username}`);
  res.status(200).json({
    status: "OK",
  });
});

app.get("/api/devices", (req, res) => {
  nv.request(req);

  if (!verifyAuthentication(req, res)) return;

  const user = db_users.find((usr) => usr.username === req.session.user);

  if (!user) {
    // TODO: I dunno what to do, this should never happen
    nv.error(
      "Database corruption: previously authenticated user is no longer a valid user"
    );
    res.status(456).json({
      status: "ERROR",
      error: "Database got corrupted, please contact an administrator",
    });
    return;
  }

  nv.info(`Successfully fetched devices for ${user.username}`);
  res.status(200).json({
    devices: user.devices,
  });
});

app.get("/api/devices/:eui([0-9a-fA-F]{16})", (req, res) => {
  nv.request(req);

  if (!verifyAuthentication(req, res)) return;

  const user = db_users.find((usr) => usr.username === req.session.user);

  if (!user) {
    // TODO: I dunno what to do, this should never happen
    nv.error(
      "Database corruption: previously authenticated user is no longer a valid user"
    );
    res.status(456).json({
      status: "ERROR",
      error: "Database got corrupted, please contact an administrator",
    });
    return;
  }

  const eui = req.params.eui;

  // TODO: Not sure this check is relevant since Express already filters the route based on a regex
  if (!validator.isEUIValid(eui)) {
    res.status(400).json({
      status: "ERROR",
      error: "EUI format invalid",
    });
    return;
  }

  if (!user.devices.find((devEUI) => devEUI === eui)) {
    nv.info(`Device ${eui} not registered by ${user.username}`);
    res.status(400).json({
      status: "ERROR",
      error: "Device has not been registered",
    });
    return;
  }

  let device = db_devices.find((dev) => dev.eui === eui);

  if (!device) {
    // TODO: I dunno what to do, this should never happen
    nv.error(
      "Database corruption: previously registered device is no longer a valid device"
    );
    res.status(456).json({
      status: "ERROR",
      error: "Database got corrupted, please contact an administrator",
    });
    return;
  }

  // Get current time in Unix Timestamp format
  const now = new Date().getTime();
  const latestStoredPos = device.positions[0];

  // If the latest stored position is too recent, send this position to the frontend client
  if (
    latestStoredPos &&
    now - latestStoredPos.timestamp < config.LoRaWan.delay * 1000
  ) {
    nv.info(
      `Successfully fetched last stored position for device ${device.eui} from server cache`
    );
    res.status(200).json(latestStoredPos);
    return;
  }

  // The latest position is too old, make an API call to the LoRaWan endpoint to obtain the latest position
  const latestPos = {}; // TODO: Replace with a call to CampusIoT to get POS

  device.positions.unshift(latestPos);
  if (device.positions.length > config.deviceMaxPos) {
    device.positions.pop();
  }

  writeJSONToFile(db_devices, "./data/devices.json");
  nv.info(
    `Successfully retrieved latest known position for device ${device.eui} from LoRaWan endpoint`
  );
  res.status(200).json(latestPos);

  /* axios
    .get(`${config.LoRaWan.endpoint.host}/devices/${eui}`, {
      headers: { "Grpc-Metadata-Authorization": `Bearer ${JWT_TOKEN}` },
    })
    .then((res2) => {
      console.log(res2);
      res.send(res2.data.device.description);
    })
    .catch((err) => {
      console.log(err);
      res.send("An error occured");
    }); */
});

app.use(function (req, res) {
  nv.request(req);
  nv.info(`Page not found: ${req.originalUrl}`);
  res.status(404).json({
    status: "ERROR",
    error: "Page not found",
  });
});

app.listen(config.port, () => {
  nv.info(`psp-backend listening at http://localhost:${config.port}`);
});

function getJWT() {
  // POST request to LoRaWan endpoint with group credentials to obtain a valid JWT
  return axios
    .post(config.LoRaWan.endpoint.host + "/internal/login", credentials)
    .then((res) => {
      nv.info(`JWT token successfully retrieved: ${res.data.jwt}`);
      return res.data.jwt;
    })
    .catch((error) => {
      nv.error(error);
      return null;
    });
}

function writeJSONToFile(obj, path) {
  // Convert JSON object to a string
  const data = JSON.stringify(obj);

  // Attempt to write file to disk
  fs.writeFile(path, data, "utf8", (err) => {
    if (err) {
      nv.error(`Error writing data to ${path}: ${err}`);
    } else {
      nv.info(`Successfully updated data in ${path}!`);
    }
  });
}

function verifyAuthentication(req, res) {
  if (!req.session.user) {
    nv.info("Authentication required");
    res.status(401).json({
      status: "ERROR",
      error: "Authentication required",
    });
    return false;
  }

  return true;
}
