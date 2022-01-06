/**
 * Username validation:
 * - Can only contains alphanumeric characters as well as "-" and "_"
 * - Must be between 3 and 15 characters long
 */
function isUsernameValid(username) {
  return username && username.match(/^[a-zA-Z0-9_-]{3,15}$/);
}

function isEmailValid(email) {
  return email && email.match(/[^@ \t\r\n]+@[^@ \t\r\n]+\.[^@ \t\r\n]+/);
}

function isPasswordValid(password) {
  return (
    password &&
    password.match(
      /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,}$/
    )
  );
}

// The eid must be a valid hexadecimal value of length 16
function isEIDValid(eid) {
  return eid && eid.match(/^[0-9a-fA-F]{16}$/);
}

function validateUserRegisterForm(username, email, password, callback) {
  let err;

  if (!isUsernameValid(username)) {
    err = "Username format invalid";
  } else if (!isEmailValid(email)) {
    err = "Email format invalid";
  } else if (!isPasswordValid(password)) {
    err = "Password format invalid";
  }

  callback(err);
}

module.exports = { validateUserRegisterForm, isEIDValid };
