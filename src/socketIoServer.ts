import { Server, Socket } from "socket.io";
import { GameState, VMIXServer } from "./vMixServer";
import Logger from "./utils/Logger";
import { PrismaClient } from "@prisma/client";

export class SocketIoServer {
  private io: Server;
  private prisma = new PrismaClient();

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
      Logger.warn(`Client disconnected [${socket.id}]`);
    });
  }

  data(socket: Socket) {
    this.vMixServer.on("data", (data) => {
      if (socket.disconnected) {
        return;
      }

      if (data.includes("FUNCTION")) {
        Logger.log(`Sending Function from vMix to Client [${socket.id}]`, data);
        socket.emit("function", data);
        this.sendXML(socket);
      }
    });
  }

  sendXML(socket: Socket) {
    if (socket.disconnected) {
      return;
    }

    this.vMixServer.sendCommand("XML");

    this.vMixServer.on("xml", (xml) => {
      socket.broadcast.emit("xml", this.vMixServer.XML);
    });

    Logger.info(
      `Send XML to Client [${socket.id}][${this.vMixServer.gameState}]`,
      "XML"
    );
  }

  getAllTeams(socket: Socket) {
    if (socket.disconnected) return;
    Logger.info(
      `Sending all teams to client [${socket.id}][${this.vMixServer.gameState}]`
    );
    this.prisma.team
      .findMany({
        include: {
          players: true,
        },
      })
      .then((teams) => {
        socket.emit("teams", teams);
        socket.broadcast.emit("teams", teams);
      });
  }

  init() {
    this.io.on("connection", (socket) => {
      // New client connected
      const clientId = socket.id;
      Logger.log(
        `New client connected [${clientId}][${this.vMixServer.gameState}]`
      );

      if (socket.disconnected) {
        return;
      }

      // Client disconnected
      this.disconnectClients(socket);

      // send all teams to client
      this.getAllTeams(socket);

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

      socket.on("addTeam", async (teams) => {
        Logger.log(
          `Received Teams from Client [${clientId}][${this.vMixServer.gameState}]`,
          teams
        );

        try {
          const createdTeam = await this.prisma.team.create({
            data: {
              name: teams.name,
              alias: teams.alias,
            },
            select: {
              id: true,
              name: true,
              alias: true,
            },
          });

          // set all players to team
          await this.prisma.player.createMany({
            data: teams.players.map((player) => ({
              name: player,
              teamId: createdTeam.id,
            })),
          });

          Logger.log(
            `Team added to database [${clientId}][${this.vMixServer.gameState}]`,
            createdTeam
          );

          this.getAllTeams(socket);
        } catch (error: Error | any) {
          Logger.error("Error adding teams", error);
        }
      });

      socket.on("deleteTeam", async (teamId) => {
        Logger.log(
          `Received Team ID from Client [${clientId}][${this.vMixServer.gameState}]`,
          teamId
        );

        try {
          await this.prisma.team.delete({
            where: {
              id: teamId,
            },
          });

          Logger.log(
            `Team deleted from database [${clientId}][${this.vMixServer.gameState}]`
          );

          this.getAllTeams(socket);
        } catch (error: Error | any) {
          Logger.error("Error deleting teams", error);
        }
      });

      socket.on("deleteAllTeams", async () => {
        Logger.log(
          `Received Delete All Teams from Client [${clientId}][${this.vMixServer.gameState}]`
        );

        try {
          await this.prisma.player.deleteMany({});
          await this.prisma.team.deleteMany({});

          Logger.log(
            `All teams deleted from database [${clientId}][${this.vMixServer.gameState}]`
          );

          this.getAllTeams(socket);
        } catch (error: Error | any) {
          Logger.error("Error deleting all teams", error);
        }
      });

      // listen for data from vMix server
      this.data(socket);
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
      // Logger.log(
      //   `Requesting Draft Data to vMix [${this.vMixServer.gameState}]`
      // );
      // this.vMixServer.sendCommand(
      //   `XMLTEXT vmix/inputs/input[${this.vMixServer.DRAFTCOUNTDOWNINDEX}]/text[@name='${this.vMixServer.DRAFTCOUNTDOWNTEXT}']`
      // );
      // this.vMixServer.on("data", (data) => {
      //   if (data.includes("XMLTEXT")) {
      //     const [, status, value] = data.split(" ");
      //     this.vMixServer.draftData.countdown = value;
      //   }
      // });
      // Logger.log(
      //   `Sending Draft Data to client [${this.vMixServer.gameState}]`,
      //   this.vMixServer.draftData.countdown
      // );
      // this.io.emit("countDownDraft", this.vMixServer.draftData.countdown);
    }
  }
}
