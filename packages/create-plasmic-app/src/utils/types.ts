export type JsOrTs = "js" | "ts";
export type PlatformType = "nextjs" | "gatsby" | "react";
export type PlatformOptions = {
  nextjs?: {
    appDir: boolean;
  };
};
export type SchemeType = "codegen" | "loader";

export function platformTypeToString(s: PlatformType): string {
  return s === "nextjs" ? "Next.js" : s === "gatsby" ? "Gatsby" : "React";
}
