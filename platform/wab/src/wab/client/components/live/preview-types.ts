import type { PreviewRender } from "@/wab/shared/live-frame-types";

export type {
  AssetModule,
  CodeModule,
  LiveFrame,
  PreviewRender,
} from "@/wab/shared/live-frame-types";

export interface SourceModule {
  name: string;
  source: string;
  lang: string;
  jsxPragma?: string;
}

export interface PreviewUpdate {
  modules: SourceModule[];
  render?: PreviewRender;
}
