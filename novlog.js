function log(req) {
  console.log(
    `[${req.ip}] ${req.method} ${req.originalUrl} with body ${JSON.stringify(
      req.body
    )}`
  );
}

module.exports = { log };
