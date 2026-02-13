import getPort from "get-port";
import http from "http";

// Common headers for all responses
const COMMON_HEADERS = {
  "Content-Type": "application/json",
  Connection: "keep-alive",
  "Access-Control-Allow-Origin": "*",
};

/**
 * Simple HTTP mock server for external APIs
 */
export class MockServer {
  private server: http.Server | null = null;
  private port: number = 0;
  logName = "[MockServer]";

  handleRequest(_url: URL): any {
    throw new Error("MockServer handleRequest must be implemented");
  }

  async start(port?: number): Promise<void> {
    this.port = port ?? (await getPort());

    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        try {
          const url = new URL(req.url || "", this.getBaseUrl());
          console.log(
            `${this.logName} ${req.method} ${url.pathname}${url.search}`
          );
          const responseData = this.handleRequest(url);
          if (responseData) {
            res.writeHead(200, COMMON_HEADERS);
            res.end(JSON.stringify(responseData));
            return;
          }
          res.writeHead(404, COMMON_HEADERS);
          res.end(JSON.stringify({ error: "Not found" }));
        } catch (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: "Internal server error" }));
        }
      });

      this.server.on("error", (err) => {
        console.error(`${this.logName} Server error:`, err);
        reject(err);
      });

      this.server.keepAliveTimeout = 120000; // 2 minutes
      this.server.headersTimeout = 125000; // Slightly longer than keepAliveTimeout

      // Listen on 127.0.0.1 explicitly to avoid IPv6 issues
      this.server.listen(this.port, "127.0.0.1", () => {
        console.log(`${this.logName} Started on ${this.getBaseUrl()}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }
    return new Promise((resolve, reject) => {
      this.server?.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`${this.logName} Stopped`);
          this.server = null;
          resolve();
        }
      });
    });
  }

  getBaseUrl(): string {
    return `http://127.0.0.1:${this.port}`;
  }
}
