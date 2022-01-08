const fs = require("fs");

const logsFolder = "./logs/";
const filePrefix = "novlog";

const LogType = {
  Info: "INFO",
  Error: "ERROR",
  Request: "REQUEST",
};

function log(data, logType) {
  const now = new Date();
  const logMsg = `[${getTimeAsString(now)}] [${logType}] - ${data}`;

  console.log(logMsg);

  // Write log data to a daily file in ./logs folder
  const dailyLogFile = `${filePrefix}${getDateAsString(now)}.log`;

  fs.appendFile(logsFolder + dailyLogFile, `${logMsg}\n`, (err) => {
    if (err) {
      throw err;
    }
  });
}

function info(msg) {
  log(msg, LogType.Info);
}

function error(msg) {
  log(msg, LogType.Error);
}

function request(req) {
  log(
    `[${req.ip}] ${req.method} ${req.originalUrl} with body ${JSON.stringify(
      req.body
    )}`,
    LogType.Request
  );
}

function getTimeAsString(time) {
  const cDay = zpad(time.getDate());
  const cMonth = zpad(time.getMonth() + 1);
  const cYear = zpad(time.getFullYear());

  const cHours = zpad(time.getHours());
  const cMinutes = zpad(time.getMinutes());
  const cSeconds = zpad(time.getSeconds());

  return `${cDay}/${cMonth}/${cYear} ${cHours}:${cMinutes}:${cSeconds}`;
}

function getDateAsString(date) {
  const cDay = zpad(date.getDate());
  const cMonth = zpad(date.getMonth() + 1);
  const cYear = date.getFullYear();
  return `${cDay}${cMonth}${cYear}`;
}

// Zero padding
function zpad(number) {
  return number < 10 ? `0${number}` : `${number}`;
}

module.exports = { error, info, request };
