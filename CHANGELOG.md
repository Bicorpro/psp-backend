# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2021-12-06

### Added

- Created backend project
- API call to campusIot to check if a device exists

## [1.0.1] - 2021-12-23

### Added

- Implemented **/api/users/register** route in API:

  - Declaration of **RegEx** validators in [validator.js](./validator.js) to validate user inputs
  - Checks for already existing user with same username/email
  - Usage of scure **bcrypt** hashing function to hash the user's password
  - Update of the user JSON file with the new user

- Started implementing **/api/users/authenticate** route in API:

  - Implemented credentials check using username/email comparisons and **bcrypt** to compare submitted password
  - **_TODO: Set a session Cookie server-side to keep track of the authentified user and send them the cookie_**

- Added default route in API to redirect to 404

## [1.0.2] - 2021-12-24

### Added

- Implemented cookies using the **express-session** package:
  - Added a specific server-side cookie to keep track of authenticated users using the given session ID
- Added error logging for **bcrypt** related function calls (salt generation + hash)
- Implemented **/api/devices/register** route in API:
  - Added new validator **isEIDValid** in [validator.js](./validator.js) to validate sent EIDs
  - Added the possibility for an authenticated user to register a device to their account
  - **_TODO:_ Make an API call to CampusIoT to check that the device is a legitimate one**

## [1.0.3] - 2022-01-06

### Added

- Added new shortucut command `npm run start` in [package.json](./package.json) to start the backend
- Added logging function in [novlog.js](./novlog.js)
- Added new documentation file [api_test.md](./api_test.md) to easily test out the API
- Implemented new functions in [index.js](./index.js):
  - The backend app now uses the [Axios library](https://axios-http.com/) instead of native HTTP functions
  - Implementend new method **getJWT** to automatically obtain the JWT on startup
  - Changed route **POST api/devices/register** to **POST api/devices/:eid** (the device ID is now passed through GET params instead of body):
    - The backend now checks with the remote LoRaWan endpoint to see whether the device is legitimate
  - Implemented route **DELETE api/devices/:eid** to allow an authenticated user to remove a registered device
  - Implemented route **GET api/devices** to allow an authenticated user to get the eids of all their devices
  - Normalized API responses (JSON objects with proper HTTP status set)
  - Refactored blocks of code intended to write to a file into the function **writeJSONToFile**

### Changed

- Updated [README](./README.md)
- Refactored configuration format in [config.json](./config.json)

### Fixed

- Fixed regular expression in function **isEIDValid** in [validator.js](./validator.js)
- Fixed error message in function **validateUserRegisterForm** in [validator.js](./validator.js)

## [1.1.0] - 2022-01-07

### Added

- Added new command line in [api_test.md](./api_test.md) for newly added route **GET /api/devices/:eui**
- Added new configuration options in [config.json](./config.json):
  - **deviceMaxPos**: maximum number of cached device positions in server file [devices.json](./data/devices.json)
  - **delay**: API call cooldown to LoRaWan endpoint (the greater the better). Used to limit API workload
- Improved logging component [novlog.js](./novlog.js):
  - Added additional log information (date, time, log type)
  - On top of log messages appearing in the console, all transactions are logged to a specific daily log file in [logs](./logs) folder
  - Renamed and refactored log functions
  - Added new log functions for different log types
- Added log messages in [index.js](./index.js)
- Started implementing route **GET /api/devices/:eui** in [index.js](./index.js):
  - Currently checks timestamps of stored device positions and compare them to current time to determine whether or not the information has become obsolete (delay can be modified in [config.json](./config.json))
  - **_TODO: Make correct API call to LoRaWan endpoint to get actual GPS data_**

### Changed

- Moved credentials from [config.json](./config.json) to [credentials.json](./credentials.json) (untracked in [.gitignore](./.gitignore))
- Fixed typo (eid -> eui):
  - Updated occurences in [README](./README.md) and [index.js](./index.js)
  - Renamed function **isEIDValid** to **isEUIValid** in [validator.js](./validator.js)
- Refactored authentication checks in [index.js](./index.js) into a seperate method **verifyAuthentication**
