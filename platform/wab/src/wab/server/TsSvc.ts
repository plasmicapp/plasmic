import {
  chunksToLinesAsync,
  onExit,
  streamEnd,
  streamWrite,
} from "@rauschma/stringio";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import nodeCleanup from "node-cleanup";
import protocol from "typescript/lib/protocol";
import { ensure, spawnPromise } from "../common";

export async function startTsSvc() {
  const subp = spawn("yarn", ["tsserver"]);
  subp.on("close", (code) => {
    console.log("TsSvc child process exited with code", code);
  });
  nodeCleanup(() => {
    console.log("cleaning up TsSvc child process due to server shutdown");
    subp.kill();
  });
  subp.stdout.setEncoding("utf8");
  subp.stderr.setEncoding("utf8");
  return new TsSvc(subp);
}

type Resolver = (response: {}) => void;

export class TsSvc {
  private waitingResolvers = new Map<number, Resolver>();
  private seq = 1;

  constructor(private subp: ChildProcessWithoutNullStreams) {
    spawnPromise(this.listen());
  }

  private async listen() {
    for await (const line of chunksToLinesAsync(this.subp.stdout)) {
      if (line.startsWith("{")) {
        const msg = JSON.parse(line);
        if (msg.request_seq !== undefined) {
          ensure(this.waitingResolvers.get(msg.request_seq))(msg);
        }
      }
    }
  }

  async reqResp(req: protocol.Request): Promise<protocol.Response> {
    spawnPromise(this.req(req));
    const p = new Promise((resolve) =>
      this.waitingResolvers.set(this.seq - 1, resolve)
    );
    const response = await p;
    return response as protocol.Response;
  }

  async req(req: protocol.Request) {
    const subp = this.subp;
    const stdin = subp.stdin;
    req = { ...req, seq: this.seq++ };
    await streamWrite(stdin, JSON.stringify(req) + "\n");
  }

  async stop() {
    await streamEnd(this.subp.stdin);
    await onExit(this.subp);
  }
}
