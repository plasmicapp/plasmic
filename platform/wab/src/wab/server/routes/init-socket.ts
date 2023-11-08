import { Server } from "http";
import socketio from "socket.io";

export class InitSocket {
  private io: socketio.Server;

  constructor() {
    this.io = new socketio.Server({
      path: "/api/v1/init-token",
    });

    this.io.on("connection", async (socket) => {
      const headers = socket.request.headers;
      const initToken = headers["x-plasmic-init-token"];
      if (initToken) {
        await socket.join(`${initToken}`);
      } else {
        socket.disconnect(true);
      }
    });
  }

  attach(server: Server) {
    this.io.attach(server);
  }

  emit(email: string, initToken: string, authToken: string) {
    this.io.to(`${initToken}`).emit("token", {
      user: email,
      token: authToken,
    });
  }
}

export const initSocket = new InitSocket();
