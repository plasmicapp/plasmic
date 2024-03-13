import { getDiscourseApiKey } from "@/wab/server/secrets";
import { BASE_URL, SYSTEM_USERNAME } from "@/wab/shared/discourse/config";
import { DiscourseClient } from "@/wab/shared/discourse/DiscourseClient";

export function createSystemDiscourseClient() {
  return new DiscourseClient(BASE_URL, getDiscourseApiKey(), SYSTEM_USERNAME);
}

export function createUserDiscourseClient(username: string) {
  return new DiscourseClient(BASE_URL, getDiscourseApiKey(), username);
}
