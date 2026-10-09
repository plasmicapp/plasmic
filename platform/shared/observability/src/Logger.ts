import type { Properties } from "./Properties";

export interface Logger {
  info(message: string, payload?: Properties): void;
  error(message: string, payload?: Properties): void;
  warn(message: string, payload?: Properties): void;
  debug(message: string, payload?: Properties): void;
}
