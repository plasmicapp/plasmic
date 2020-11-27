import socketio from "socket.io-client";

const timeout = 5 * 60 * 1000; // 5 minutes in milisseconds

export function pollAuthToken(
  host: string,
  email: string,
  initToken: string
): Promise<string> {
  const socket = socketio.connect(host, {
    path: `/api/v1/init-token`,
    transportOptions: {
      polling: {
        extraHeaders: {
          "x-plasmic-init-email": email,
          "x-plasmic-init-token": initToken,
        },
      },
    },
  });

  const promise = new Promise<string>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject("timeout");
      socket.close();
    }, timeout);

    socket.on("connect", (reason: string) => {
      console.log("Waiting for token...");
    });

    socket.on("disconnect", (reason: string) => {
      console.warn("Disconnected. Retrying...");
    });

    socket.on("connect_error", () => {
      console.warn("Connection error. Retrying...");
    });

    socket.on("token", (data: { token: string }) => {
      clearTimeout(timeoutId);
      resolve(data.token);
      socket.close();
    });

    socket.on("error", (error: {}) => {
      console.warn(error);
    });
  });

  return promise;
}
