import { Connection, vMixApiFunctionCommand } from "node-vmix";
import Logger from "./utils/Logger";

const vMixHost = "localhost";

export class VMIXServer {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(vMixHost);
  }

  init() {
    this.connection.on("connect", () => {
      Logger.info(`Connected to vMix via TCP ${vMixHost}:8088`);
    });
  }

  on(event: string, callback: (data: any) => void) {
    this.connection.on(event, callback);
  }

  sendCommand(
    command:
      | string
      | string[]
      | vMixApiFunctionCommand
      | vMixApiFunctionCommand[]
  ) {
    this.connection.send(command);
    Logger.info("Sent command", command);
  }
}
