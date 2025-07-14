import dotenv from "dotenv";
import { getEnvVar } from "../utils/get-env-var";

type Environment = {
  baseUrl: string;
  testUser: {
    email: string;
    password: string;
  };
};

function loadEnv(): Environment {
  dotenv.config({ path: ".env.local" });
  return {
    baseUrl: getEnvVar("BASE_URL", "http://localhost:3003"),
    testUser: {
      email: getEnvVar("TEST_USER_EMAIL", "user2@example.com"),
      password: getEnvVar("TEST_USER_PASSWORD", "!53kr3tz!"),
    },
  };
}

export { Environment, loadEnv };
