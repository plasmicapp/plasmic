import { Properties } from "@/wab/shared/observability/Properties";

export interface Logger {
  info(message: string, payload?: Properties): void;
  error(message: string, payload?: Properties): void;
  warn(message: string, payload?: Properties): void;
  debug(message: string, payload?: Properties): void;
  child(context: Properties): Logger;
}
