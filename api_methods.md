# API Methods

POST /api/users/register -> register (login and password in body)
POST /api/users/authenticate -> login and password in body, get a cookie when authentified

GET /api/users/{username}/devices/{id} -> get device with {id} from user with {username}
GET /api/users/{username}/devices -> get all devices registered by user with {username}
POST /api/users/{username}/devices -> register a new device for user with {username}
DELETE /api/users/{username}/devices/{id} -> unregister device with {id} from user with {username}
