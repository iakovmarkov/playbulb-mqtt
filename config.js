const nconf = require("nconf");
const path = require("path");
const debug = require("debug")("svet:config");

const DEFAULTS = {
  MQTT_HOST: "http://core.lan",
  DEVICES: [
    {
      name: "desk",
      addr: "72:1A:4B:14:AC:E6",
      uuid: "721a4b14ace6",
      handle: 0x23,
    },
    {
      name: "tv",
      addr: "A7:E5:4B:14:AC:E6",
      uuid: "a7e54b14ace6",
      handle: 0x23,
    },
    {
      name: "sphere",
      addr: "2C:F7:4B:16:AC:E6",
      uuid: "2cf74b16ace6",
      handle: 0x29,
    },
    {
      name: "lamp",
      addr: "6A:4D:4B:0F:AC:E6",
      uuid: "6a4d4b0face6",
      handle: 0x1b,
    },
  ],
};

nconf
  .argv()
  .env()
  .file({ file: path.resolve(__dirname, ".env") })
  .defaults(DEFAULTS);

module.exports = nconf;
