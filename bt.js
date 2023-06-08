const debug = require("debug")("svet:bluetooth");
const noble = require("@abandonware/noble");

noble.on("stateChange", () => debug("Bluetooth state changed to", noble.state));
noble.on("scanStart", () => debug("Bluetooth started scan"));
noble.on("warning", (e) => debug("Bluetooth warn:", e));

const powerNoble = () =>
  new Promise((resolve) => {
    if (noble.state === "poweredOn") {
      debug("noble powered on");
      resolve();
      return;
    }

    debug("Awaiting Bluetooth power state...");
    noble.on("stateChange", () => {
      if (noble.state === "poweredOn") {
        resolve();
      }
    });
  });

const read = (device, handle) =>
  new Promise((resolve, reject) => {
    device.readHandle(handle, (error, data) => {
      if (error) {
        reject(error);
      }
      resolve(data);
    });
  });

const write = (device, data) =>
  new Promise(async (resolve, reject) => {
    const write = async () => {
      debug(
        `Writing ${data.toString ? data.toString() : data} to ${
          device.handle
        } of ${device.name}`
      );

      if (!Buffer.isBuffer(data)) data = Buffer.from(data);

      device.peripheral.writeHandle(
        // device.uuid,
        device.handle,
        data,
        true /* write without waiting for response */,
        (error) => {
          if (error) {
            debug(`Error writing to ${device.name}: ${error}`);
            reject(error);
          } else {
            debug(`Written to ${device.name}`);
            resolve();
          }
        }
      );
    };

    if (device.peripheral && device.peripheral.state === "connected") {
      await write();
    } else if (device.peripheral && device.peripheral.state === "connecting") {
      debug(
        `Connection to ${device.name} (${device.uuid}) already in progress, skip writing...`
      );
    } else if (device.peripheral) {
      debug(`Awaiting connection to ${device.name} (${device.uuid})...`);
      await device.peripheral.connectAsync();
      await write();
    } else {
      debug(`Device ${device.name} (${device.uuid}) not found`);
    }
  });

const connect = (device) =>
  new Promise(async (resolve, reject) => {
    // try {
    //   await device.connectAsync();
    //   resolve();
    // } catch (e) {
    //   console.error("Connecting to device failed", e);
    //   reject(e);
    // }
  });

const startScan = (bt) =>
  new Promise((resolve) => {
    debug("Awaiting Bluetooth scan start...");
    bt.startScanning();
    bt.on("scanStart", () => {
      resolve();
    });
  });

const initBluetooth = () =>
  new Promise(async (resolve) => {
    if (noble.state !== "poweredOn") {
      debug("Initializing Bluetooth...");
      await powerNoble();
    }
    debug("Bluetooth on, scanning...");
    resolve(noble);
  });

module.exports = {
  initBluetooth,
  startScan,
  connect,
  read,
  write,
};
