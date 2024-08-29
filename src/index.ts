import express, { Request, Response } from "express";
import { createServer } from "http";
import { SocketIoServer } from "./socketIoServer";
import { VMIXServer } from "./vMixServer";
import Logger from "./utils/Logger";

const PORT = 3000;
const app = express();
const server = createServer(app);

const vMixServer = new VMIXServer();
const socketIoServer = new SocketIoServer(server, vMixServer);

socketIoServer.init();

server.listen(PORT, () => {
  Logger.info(`Server running on port localhost:${PORT}`);
});
