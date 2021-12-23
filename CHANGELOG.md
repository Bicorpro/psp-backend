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
