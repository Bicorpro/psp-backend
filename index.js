// Node dependencies
const fs = require("fs");
const express = require("express");
const bodyParser = require("body-parser");
const https = require("https");
const bcrypt = require("bcrypt");

// Local dependencies
const validator = require("./validator.js");

// Load configuration and data files
const config = require("./config.json");
const db_users = require("./data/users.json");
const db_devices = require("./data/devices.json");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
const port = 3000;

const saltRounds = 10;

// !unsecure way : deactivating certificate checks
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

// proper way to allow CampusIot -> download SSL certificate
//require("https").globalAgent.options.ca = require("ssl-root-cas/latest").create();

app.get("/", (_, res) => {
  res.send("Hello World!");
});

app.get("/api", (_req, res) => {
  res.send("Hello api!");
});

app.post("/api/users/register", (req, res) => {
  // Get username, email and password from POST body
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;

  // Validate the form information entered by the user
  validator.validateUserRegisterForm(username, email, password, (err) => {
    // if the form information is invalid, send the error to the frontend
    if (err) {
      res.send(err);
      return;
    }

    if (db_users.find((user) => user.username === username)) {
      res.send(`User already exists!`);
      return;
    }

    if (db_users.find((user) => user.email === email)) {
      res.send(`An account has already been registered with this email!`);
      return;
    }

    // Generates a salt and hashes the new user's password
    bcrypt.genSalt(saltRounds, function (err, salt) {
      bcrypt.hash(password, salt, function (err, hash) {
        // create the new user
        const niu = {
          username: username,
          email: email,
          password: hash,
          devices: [],
        };
        db_users.push(niu);

        // convert JSON object to a string
        const data = JSON.stringify(db_users);

        // write file to disk
        fs.writeFile("./data/users.json", data, "utf8", (err) => {
          if (err) {
            console.log(`Error writing file: ${err}`);
          } else {
            console.log(`File is written successfully!`);
          }
        });
      });
    });

    res.sendStatus(200);
  });
});

app.post("/api/users/authenticate", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const user = db_users.find(
    (usr) => usr.username === username || usr.email === username
  );

  if (!user) {
    res.send("Invalid login");
  }

  // Load hash from your password DB.
  bcrypt.compare(password, user.password, function (err, result) {
    if (result) {
      res.send(`hey ${user.username}!`);
    } else {
      res.send("Invalid login");
      /**
       * TODO: Create and send a new cookie to identify the authentified user??
       * TODO: This cookie will be provided by the user every time they use the API??
       */
    }
  });
});

app.post("/api/devices/register", (req, res) => {
  const _POST_deviceID = "";
  const _POST_session_cookie = "";

  // retrieve user from cookie
  // check if device is a valid tracker
  // check if device has not already been registered by a user
  // eventually protect devices with default password that can be changed to prevent a user to re-register a device that is not their own
  // if device and user are legitimate, return success
});

app.delete("/api/devices/:id([0-9a-fA-F]{16})/delete", (req, res) => {
  // unbind tracker from user
  //! tracker will be free and anyone with the ID will be allowed to register it
});

app.get("/api/devices/:id([0-9a-fA-F]{16})/pos", (req, res) => {
  const deviceID = req.params["id"];
  const USER_TOKEN = config.jwt;

  const AuthStr = "Bearer ".concat(USER_TOKEN);
  const options = {
    hostname: config.LoRaWan.endpoint.host,
    port: config.LoRaWan.endpoint.port,
    path: "/api/devices/" + deviceID,
    method: "GET",
    headers: {
      Authorization: AuthStr,
    },
  };

  const req1 = https.request(options, (res2) => {
    console.log(`statusCode: ${res.statusCode}`);

    res2.on("data", (d) => {
      const device = JSON.parse(d);
      console.log(device);

      if (device.device) {
        // TODO: fetch gps data from CampusIot
        let gps = {
          x: 1,
          y: 2,
        };
        res.json({ device: deviceID, gps: gps });
      } else {
        res.json({ error: "unknown device id" });
      }
    });
  });

  req1.on("error", (error) => {
    console.error(error);
  });

  req1.end();
});

app.use(function (_, res) {
  res.sendStatus(404);
});

app.listen(port, () => {
  console.log(`psp-backend listening at http://localhost:${port}`);
});
