// Exact copy in packages/loader-fetcher and platform/live-frame, which are in
// separate pnpm workspaces. Keep both identical.

export interface CodeModule {
  fileName: string;
  code: string;
  imports: string[];
  type: "code";
}

export interface AssetModule {
  fileName: string;
  source: string;
  type: "asset";
}
