const { signToken } = require("../../src/utils/jwt");

function authHeader(userId = "test-user-id") {
  return `Bearer ${signToken(userId)}`;
}

module.exports = { authHeader };