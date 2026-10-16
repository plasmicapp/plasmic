// live-frame is a separate pnpm workspace, so wab can't import it by package name.
export type {
  AssetModule,
  CodeModule,
  LiveFrame,
  PreviewRender,
  WindowWithLiveFrame,
} from "../../../../live-frame/src/types";
