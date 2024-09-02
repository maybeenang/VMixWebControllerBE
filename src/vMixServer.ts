import { Connection, vMixApiFunctionCommand } from "node-vmix";
import Logger from "./utils/Logger";
import "dotenv/config";
import { BaseInput } from "vmix-js-utils/dist/types/inputs";
import { XMLValidator } from "fast-xml-parser";
import { XmlApi as vMixXmlApi } from "vmix-js-utils";
import { Socket } from "socket.io";

const vMixHost = process.env.VMIX_HOST || "localhost";

export enum GameState {
  INGAME = "ingame",
  DRAFT = "draft",
  IDLE = "idle",
  RESULT = "result",
}

export class VMIXServer {
  private connection: Connection;

  public DRAFTCOUNTDOWN: string;
  public DRAFTCOUNTDOWNTEXT: string;
  public DRAFTCOUNTDOWNINDEX: number;
  public INPUTS: BaseInput[];
  public XML: string;

  public gameState: GameState;

  public draftData: {
    countdown: number;
  };

  constructor() {
    this.connection = new Connection(vMixHost, {
      // debug: true,
    });

    this.DRAFTCOUNTDOWN = process.env.DRAFTCOUNTDOWN || "draft.gtzip";
    this.DRAFTCOUNTDOWNTEXT =
      process.env.DRAFTCOUNTDOWNTEXT || "TextBlock1.Text";

    this.INPUTS = [];
    this.DRAFTCOUNTDOWNINDEX = -1;
    this.XML = "";

    this.gameState = GameState.IDLE;

    this.draftData = {
      countdown: 0,
    };
  }

  init() {
    this.connection.on("connect", () => {
      Logger.info(`Connected to vMix via TCP ${vMixHost}:8088`);

      this.sendCommand("XML");
      this.sendCommand("SUBSCRIBE TALLY");
      this.sendCommand("SUBSCRIBE ACTS");
    });

    this.connection.on("xml", (receivedXml) => {
      Logger.info(`Received XML from vMix [${this.gameState}]`, "XML");
      this.XML = receivedXml;

      // set xml data if valid
      if (XMLValidator.validate(receivedXml) === true) {
        const parsedXml = vMixXmlApi.DataParser.parse(receivedXml);
        const xmlInputs = vMixXmlApi.Inputs.extractInputsFromXML(parsedXml);
        this.INPUTS = vMixXmlApi.Inputs.map(xmlInputs);
        // console.log("inputs", inputs);

        this.DRAFTCOUNTDOWNINDEX =
          this.INPUTS.findIndex(
            (input) => input.title === this.DRAFTCOUNTDOWN
          ) + 1;
      }
    });

    this.connection.on("tally", (tally) => {
      Logger.info(`Received TALLY from vMix [${this.gameState}]`, tally);
    });

    this.connection.on("acts", (data) => {
      const [, status, event, index, state] = data.split(" ");

      if (parseInt(index) === this.DRAFTCOUNTDOWNINDEX) {
        if (event === "InputPlaying" && state === "1") {
          this.gameState = GameState.DRAFT;
          Logger.info("Game State", this.gameState);
        } else {
          this.gameState = GameState.IDLE;
          Logger.info("Game State", this.gameState);
        }
      }

      Logger.info(`Received ACTS from vMix [${this.gameState}]`, data);
    });

    this.connection.on("data", (data) => {
      // skip if data is XML
      if (XMLValidator.validate(data) === true) {
        return;
      }

      Logger.info(`Received Data from vMix [${this.gameState}]`, data);
    });

    this.connection.on("close", () => {
      Logger.warn("Disconnected from vMix");
      this.sendCommand("UNSUBSCRIBE TALLY");
      this.sendCommand("UNSUBSCRIBE ACTS");
    });

    this.connection.on("error", (error) => {
      Logger.error("vMix Connection Error", error);
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
    Logger.info(`Sending Command to vMix [${this.gameState}]`, command);
    this.connection.send(command);
  }
}
