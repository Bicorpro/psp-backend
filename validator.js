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

function validateUserRegisterForm(username, email, password, callback) {
  let err;

  if (!isUsernameValid(username)) {
    err = "Sadge invalid username";
  } else if (!isEmailValid(email)) {
    err = "Sadge ur email sucks";
  } else if (!isPasswordValid(password)) {
    err = "ur password is a weak ass mf";
  }

  callback(err);
}

module.exports = { validateUserRegisterForm };
