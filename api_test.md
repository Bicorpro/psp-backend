# API Test

This file contain various commands that can be used to test the different API methods.
The two following sections contain the complete set of commands for two users: **johndoe** and **foo**.

**_NB: These commands are based on a localhost URL, please make sur you have the backend server running locally on port 3000 before testing these commandes otherwise it will not work._**

## Commands for johndoe

- **register user:** `curl -X POST -d 'username=johndoe' -d 'email=johndoe@pspmail.com' -d 'password=Azerty12345#' http://localhost:3000/api/users/register`
- **authenticate user:** `curl -X POST -d 'username=johndoe' -d 'password=Azerty12345#' -c cookie1.txt http://localhost:3000/api/users/authenticate`
- **register device:** `curl -X POST -b cookie1.txt http://localhost:3000/api/devices/E24F43FFFE44D05F`
- **get all devices:** `curl -X GET -b cookie1.txt http://localhost:3000/api/devices`
- **get device:** `curl -X GET -b cookie1.txt http://localhost:3000/api/devices/E24F43FFFE44D05F`
- **remove a device:** `curl -X DELETE -b cookie1.txt http://localhost:3000/api/devices/E24F43FFFE44D05F`

## Commands for foo

- **register user:** `curl -X POST -d 'username=foo' -d 'email=foo@foomail.com' -d 'password=#FooF00#' http://localhost:3000/api/users/register`
- **authenticate user:** `curl -X POST -d 'username=foo' -d 'password=#FooF00#' -c cookie2.txt http://localhost:3000/api/users/authenticate`
- **register device:** `curl -X POST -b cookie2.txt http://localhost:3000/api/devices/E24F43FFFE44D05F`
- **get all devices:** `curl -X GET -b cookie2.txt http://localhost:3000/api/devices`
- **get device:** `curl -X GET -b cookie2.txt http://localhost:3000/api/devices/E24F43FFFE44D05F`
- **remove a device:** `curl -X DELETE -b cookie2.txt http://localhost:3000/api/devices/E24F43FFFE44D05F`
