import { Server } from "http";
import { Server as SocketIoServer } from "socket.io";

export class InitSocket {
  private io: SocketIoServer;

  constructor() {
    this.io = new SocketIoServer({
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
