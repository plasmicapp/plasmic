import { getEnvVar } from "../utils/env";

export type Environment = {
  baseUrl: string;
  testUser: {
    email: string;
    password: string;
  };
};

export function loadEnv(): Environment {
  return {
    baseUrl: getEnvVar("BASE_URL", "http://localhost:3003"),
    testUser: {
      email: getEnvVar("TEST_USER_EMAIL", "user2@example.com"),
      password: getEnvVar("TEST_USER_PASSWORD", "!53kr3tz!"),
    },
  };
}

export const ENVIRONMENT = loadEnv();
