import { Server } from "socket.io";

let io: Server | null = null;

export const setIO = (ioInstance: Server) => {
  io = ioInstance;
};

export const getIO = (): Server | null => {
  return io;
};
