// Jest: react-native-udp mirrors Node's dgram API, so tests use Node sockets.
const dgram = require('dgram');

module.exports = {
  __esModule: true,
  default: { createSocket: options => dgram.createSocket(options.type) },
};
