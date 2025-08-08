import dotenvx from "@dotenvx/dotenvx";
import path from "path";

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Environment variable "${name}" is not defined.`);
  }
  return value;
}

export type Environment = {
  baseUrl: string;
  testUser: {
    email: string;
    password: string;
  };
};

function loadEnv(): Environment {
  dotenvx.config({
    path: path.resolve(__dirname, "..", `.env.${process.env.ENV ?? "test"}`),
  });
  return {
    baseUrl: getEnvVar("BASE_URL"),
    testUser: {
      email: getEnvVar("TEST_USER_EMAIL"),
      password: getEnvVar("TEST_USER_PASSWORD"),
    },
  };
}

export const ENVIRONMENT = loadEnv();
