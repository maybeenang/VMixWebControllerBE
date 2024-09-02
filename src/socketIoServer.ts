import { Server, Socket } from "socket.io";
import { GameState, VMIXServer } from "./vMixServer";
import Logger from "./utils/Logger";

export class SocketIoServer {
  private io: Server;

  constructor(private app, private vMixServer: VMIXServer) {
    // @ts-ignore
    this.io = new Server(app, {
      cors: {
        origin: "*",
      },
    });

    this.vMixServer.init();
  }

  disconnectClients(socket: Socket) {
    socket.on("disconnect", () => {
      Logger.warn(
        `Client disconnected [${socket.id.substring(socket.id.length - 3)}]`
      );
    });
  }

  data(socket: Socket) {
    this.vMixServer.on("data", (data) => {
      if (socket.disconnected) {
        return;
      }

      if (data.includes("FUNCTION")) {
        Logger.log(
          `Sending Function from vMix to Client [${socket.id.substring(
            socket.id.length - 3
          )}]`,
          data
        );
        socket.emit("function", data);
      }
    });
  }

  sendXML(socket: Socket) {
    this.vMixServer.sendCommand("XML");
    // TODO : BROADCAST?
    socket.emit("xml", this.vMixServer.XML);
    Logger.info(
      `Send XML to Client [${socket.id.substring(socket.id.length - 3)}][${
        this.vMixServer.gameState
      }]`,
      "XML"
    );
  }

  init() {
    this.io.on("connection", (socket) => {
      // New client connected
      const clientId = socket.id.substring(socket.id.length - 3);
      Logger.log(
        `New client connected [${clientId}][${this.vMixServer.gameState}]`
      );

      // send initial game state to client
      this.sendXML(socket);

      // On command event, send command to vMix server
      socket.on("command", (command) => {
        Logger.log(
          `Received Command from Client [${clientId}][${this.vMixServer.gameState}]`,
          command
        );
        this.vMixServer.sendCommand(command);
      });

      // listen for data from vMix server
      this.data(socket);

      // Client disconnected
      this.disconnectClients(socket);
    });

    this.io.on("error", (error) => {
      Logger.error("Socket.io error", error);
    });

    // for real time data
    setInterval(() => {
      this.tick();
    }, 1000);
  }

  tick() {
    if (this.vMixServer.gameState === GameState.DRAFT) {
      Logger.log(
        `Requesting Draft Data to vMix [${this.vMixServer.gameState}]`
      );
      this.vMixServer.sendCommand(
        `XMLTEXT vmix/inputs/input[${this.vMixServer.DRAFTCOUNTDOWNINDEX}]/text[@name='${this.vMixServer.DRAFTCOUNTDOWNTEXT}']`
      );

      this.vMixServer.on("data", (data) => {
        if (data.includes("XMLTEXT")) {
          const [, status, value] = data.split(" ");
          this.vMixServer.draftData.countdown = value;
        }
      });
      Logger.log(
        `Sending Draft Data to client [${this.vMixServer.gameState}]`,
        this.vMixServer.draftData.countdown
      );
      this.io.emit("countDownDraft", this.vMixServer.draftData.countdown);
    }
  }
}
