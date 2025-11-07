// Import necessary types from ApiSchema
import type {
  InitServerInfo,
  ServerSessionsInfo,
  UpdatePlayerViewRequest,
} from "@/wab/shared/ApiSchema";
import type {
  MinimalRevisionInfo,
  PkgVersionInfoMeta,
} from "@/wab/shared/SharedApi";

type MessageHandler<T> = (data: T) => unknown | Promise<unknown>;

/**
 * Events that clients can emit.
 */
export type ClientToServerEvents = {
  subscribe: MessageHandler<{
    namespace: string;
    projectIds?: string[];
    studio?: boolean;
  }>;
  view: MessageHandler<UpdatePlayerViewRequest>;
};

/**
 * Events that the server can emit.
 *
 * All events from clients are forwarded (this may not be true in the future).
 */
export type ServerToClientEvents = {
  connect: MessageHandler<{}>;
  disconnect: MessageHandler<{}>;
  initServerInfo: MessageHandler<InitServerInfo>;
  commentsUpdate: MessageHandler<{}>;
  update: MessageHandler<{
    projectId: string;
    rev: MinimalRevisionInfo;
  }>;
  players: MessageHandler<ServerSessionsInfo>;
  error: MessageHandler<string>;
  publish: MessageHandler<PkgVersionInfoMeta & { projectId: string }>;
  hostlessDataVersionUpdate: MessageHandler<{ hostlessDataVersion: number }>;
};

export type BroadcastPayload = {
  /** Null room means broadcast to all rooms */
  room: string | null;
} & ToEventPayload<ServerToClientEvents>;

// Socket data (data attached to socket instance)
export interface SocketData {
  user?: any;
  sessionID?: string;
}

/**
 * Converts events map to a union of event payloads.
 *
 * Input:
 * ```
 * {
 *   eventName: (message: EventMessageType) => void;
 *   eventName2: (message: EventMessageType2) => void;
 * }
 * ```
 *
 * Output:
 * ```
 * {
 *   type: "eventName";
 *   message: EventMessageType;
 * } | {
 *   type: "eventName2";
 *   message: EventMessageType2;
 * }
 * ```
 */
type ToEventPayload<T extends { [k: string]: (message: any) => void }> = {
  [K in keyof T]: {
    type: K;
    message: Parameters<T[K]>[0];
  };
}[keyof T];
