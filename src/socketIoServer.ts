import { Server } from "socket.io";
import { VMIXServer } from "./vMixServer";
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
  }

  init() {
    this.io.on("connection", (socket) => {
      Logger.info("New client connected");

      this.vMixServer.sendCommand("XML");

      this.vMixServer.on("xml", (data) => {
        socket.emit("xml", data);
      });

      socket.on("command", (command) => {
        Logger.info("Received command", command);
        this.vMixServer.sendCommand(command);
      });

      socket.on("disconnect", () => {
        Logger.info("Client disconnected");
      });
    });

    this.io.on("error", (error) => {
      Logger.error("Socket.io error", error);
    });

    this.vMixServer.init();
  }
}
