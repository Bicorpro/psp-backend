# psp-backend

NodeJS backend application using the Express framework

## Supported API methods

- user:
  - register (POST /api/users/register) -> register (login and password in body)
  - login (POST /api/users/authenticate) -> login and password in body, get a cookie when authentified
- device/tracker:
  - register (POST /api/users/{username}/devices) -> register a new device for user with {username}
  - get devices (GET /api/users/{username}/devices/{id}) -> get device with {id} from user with {username}
  - get device (GET /api/users/{username}/devices) -> get all devices registered by user with {username}
  - delete (DELETE /api/users/{username}/devices/{id}) -> unregister device with {id} from user with {username}
