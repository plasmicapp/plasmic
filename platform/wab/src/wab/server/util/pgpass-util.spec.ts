import { extractUsernameAndPasswordFromPgPass } from "@/wab/server/util/pgpass-util";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

describe("pgpass-util", () => {
  let tempDir: string;
  let originalHome: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "pgpass-test-"));
    originalHome = process.env.HOME;
    process.env.HOME = tempDir;
  });

  afterEach(() => {
    process.env.HOME = originalHome;
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("extractUsernameAndPasswordFromPgPass", () => {
    it("should extract password for existing user", () => {
      const pgpassContent = `# Comment line
localhost:5432:*:wab:password123
postgres-wab-cluster:5432:*:wabro:secretpass456
localhost:5432:*:cypress:testpass789
`;
      writeFileSync(join(tempDir, ".pgpass"), pgpassContent);

      const result = extractUsernameAndPasswordFromPgPass("wabro");

      expect(result).toEqual({
        username: "wabro",
        password: "secretpass456",
      });
    });

    it("should return undefined password for non-existent user", () => {
      const pgpassContent = `localhost:5432:*:wab:password123
localhost:5432:*:cypress:testpass789
`;
      writeFileSync(join(tempDir, ".pgpass"), pgpassContent);

      const result = extractUsernameAndPasswordFromPgPass("nonexistent");

      expect(result).toEqual({
        username: "nonexistent",
        password: undefined,
      });
    });

    it("should return undefined password when pgpass file does not exist", () => {
      const result = extractUsernameAndPasswordFromPgPass("wabro");

      expect(result).toEqual({
        username: "wabro",
        password: undefined,
      });
    });

    it("should ignore comment lines", () => {
      const pgpassContent = `# This is a comment
# Another comment
localhost:5432:*:wab:password123
# postgres-wab-cluster:5432:*:wabro:commented_out
postgres-wab-cluster:5432:*:wabro:actual_password
`;
      writeFileSync(join(tempDir, ".pgpass"), pgpassContent);

      const result = extractUsernameAndPasswordFromPgPass("wabro");

      expect(result).toEqual({
        username: "wabro",
        password: "actual_password",
      });
    });

    it("should ignore empty lines", () => {
      const pgpassContent = `
localhost:5432:*:wab:password123

postgres-wab-cluster:5432:*:wabro:secretpass456

`;
      writeFileSync(join(tempDir, ".pgpass"), pgpassContent);

      const result = extractUsernameAndPasswordFromPgPass("wabro");

      expect(result).toEqual({
        username: "wabro",
        password: "secretpass456",
      });
    });

    it("should handle lines with extra whitespace", () => {
      const pgpassContent = `  localhost:5432:*:wab:password123  
postgres-wab-cluster:5432:*:wabro:secretpass456
`;
      writeFileSync(join(tempDir, ".pgpass"), pgpassContent);

      const result = extractUsernameAndPasswordFromPgPass("wabro");

      expect(result).toEqual({
        username: "wabro",
        password: "secretpass456",
      });
    });

    it("should handle lines with more than 5 parts (password contains colons)", () => {
      const pgpassContent = `localhost:5432:*:wab:password123
invalid:line:here
postgres-wab-cluster:5432:*:wabro:secretpass456:extra
another:invalid
`;
      writeFileSync(join(tempDir, ".pgpass"), pgpassContent);

      const result = extractUsernameAndPasswordFromPgPass("wabro");

      // Password with colons should be treated as "secretpass456:extra"
      expect(result).toEqual({
        username: "wabro",
        password: "secretpass456:extra",
      });
    });

    it("should handle password with special characters", () => {
      const pgpassContent = `postgres-wab-cluster:5432:*:wabro:p@ss:w0rd!#$%
`;
      writeFileSync(join(tempDir, ".pgpass"), pgpassContent);

      const result = extractUsernameAndPasswordFromPgPass("wabro");

      expect(result).toEqual({
        username: "wabro",
        password: "p@ss:w0rd!#$%",
      });
    });

    it("should match exact username only", () => {
      const pgpassContent = `localhost:5432:*:wab:password123
localhost:5432:*:wabro:secretpass456
localhost:5432:*:wabrotest:wrongpass789
`;
      writeFileSync(join(tempDir, ".pgpass"), pgpassContent);

      const result = extractUsernameAndPasswordFromPgPass("wabro");

      expect(result).toEqual({
        username: "wabro",
        password: "secretpass456",
      });
    });

    it("should return first match if multiple entries exist for same user", () => {
      const pgpassContent = `localhost:5432:*:wabro:firstpass
postgres-wab-cluster:5432:*:wabro:secondpass
`;
      writeFileSync(join(tempDir, ".pgpass"), pgpassContent);

      const result = extractUsernameAndPasswordFromPgPass("wabro");

      expect(result).toEqual({
        username: "wabro",
        password: "firstpass",
      });
    });
  });
});
