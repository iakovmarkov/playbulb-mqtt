const mqtt = require("mqtt");
const debug = require("debug")("svet:application");
const chroma = require("chroma-js");
const clearScreen = require("./clearScreen");
const bt = require("./bt");
const nconf = require("./config");
const pSBC = require("./psbc");

const DEFAULT_COLOR = [255, 255, 255];

class PlaybulbController {
  constructor() {
    debug("Playbulb-MQTT initializing");
    this.noble = null;
    this.devices = [].concat(nconf.get("DEVICES"));

    this.initBluetooth();
    this.initMqtt();
  }

  async initBluetooth() {
    this.noble = await bt.initBluetooth();
    await bt.startScan(this.noble);

    this.noble.on("discover", async (peripheral) => {
      const device = this.devices.find((d) => d.uuid === peripheral.uuid);
      if (device) {
        debug(
          "Playbulb found:",
          peripheral.advertisement.localName,
          device.name
        );
        device.peripheral = peripheral;
        peripheral.connect();
        peripheral.once("connect", () => debug(`Connected: ${device.name}`));
      }
    });
  }

  async initMqtt() {
    debug(`Connecting to ${nconf.get("MQTT_HOST")}`);
    const client = mqtt.connect(nconf.get("MQTT_HOST"));

    const handlers = {
      [`playbulb/light/switch`]: (value, device) => {
        value = String(value).toLowerCase() === `true`;
        this.toggle(value, device);

        const { on, color, brightness } = device;
        client.publish(
          `playbulb/${device.name}/light/status`,
          JSON.stringify({ on, color, brightness })
        );
        client.publish(
          `playbulb/${device.name}/rgb/status`,
          JSON.stringify({ on, color, brightness })
        );
        client.publish(
          `playbulb/${device.name}/brightness/status`,
          JSON.stringify({ on, color, brightness })
        );
      },
      [`playbulb/rgb/set`]: (value, device) => {
        this.setColor(value.split(`,`), device);
        const { on, color, brightness } = device;

        client.publish(
          `playbulb/${device.name}/light/status`,
          JSON.stringify({ on, color, brightness })
        );
        client.publish(
          `playbulb/${device.name}/rgb/status`,
          JSON.stringify({ on, color, brightness })
        );
        client.publish(
          `playbulb/${device.name}/brightness/status`,
          JSON.stringify({ on, color, brightness })
        );
      },
      [`playbulb/brightness/set`]: (brightness, device) => {
        this.setBrightness(brightness, device);
        const { on, color } = device;

        client.publish(
          `playbulb/${device.name}/light/status`,
          JSON.stringify({ on, color, brightness })
        );
        client.publish(
          `playbulb/${device.name}/rgb/status`,
          JSON.stringify({ on, color, brightness })
        );
        client.publish(
          `playbulb/${device.name}/brightness/status`,
          JSON.stringify({ on, color, brightness })
        );
      },
    };

    client.on("connect", () => {
      client.subscribe([`playbulb/#`], (err) => {
        if (!err) {
          debug("MQTT Connected");
          const { on, color } = this;
          for (const device of this.devices) {
            client.publish(
              `playbulb/${device.name}/light/status`,
              JSON.stringify({ on, color })
            );
            client.publish(
              `playbulb/${device.name}/rgb/status`,
              JSON.stringify({ on, color })
            );
          }
        }
      });
    });

    client.on("error", (error) => {
      console.error("Connection Error:", error);
    });

    client.on("message", (topic, message) => {
      const [prefix, deviceName, ...command] = topic.split("/");
      const device = this.devices.find((d) => d.name === deviceName);

      if (prefix !== "playbulb" || command.includes("status") || !device)
        return;

      const handler = handlers[[prefix, ...command].join("/")];
      if (typeof handler === "function") {
        debug("Starting handler: ", topic, message.toString());
        handler(message.toString(), device);
      } else {
        debug("No handler: ", topic, message.toString);
      }
    });
  }

  setColor(color, device) {
    device.color = color;
    this.update(device);
  }

  setBrightness(brightness, device) {
    device.brightness = brightness;
    this.update(device);
  }

  toggle(value, device) {
    device.on = value;
    device.brightness = value ? 255 : 0;
    if (value) {
      bt.write(device, [0, ...(device.color || DEFAULT_COLOR)]);
    } else {
      bt.write(device, [0, 0, 0, 0]);
    }
  }

  update(device) {
    const brightness =
      typeof device.brightness !== "undefined" ? device.brightness : 255;
    const color =
      typeof device.color !== "undefined" ? device.color : DEFAULT_COLOR;
    const newColor = pSBC(brightness / 255, `rgb(${color.join(",")})`);

    debug("color", color);
    debug("brightness", brightness);
    debug("nc", newColor);

    bt.write(device, [0, ...color]);
  }
}

clearScreen();
new PlaybulbController();
