import jsonrepair from "jsonrepair";

export function fixJson(jsonString: string): string {
  return jsonrepair(jsonString.trim().replace(/[\]}]+$/, ""));
}
