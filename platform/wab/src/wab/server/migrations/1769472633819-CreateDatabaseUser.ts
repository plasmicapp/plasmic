import { extractUsernameAndPasswordFromPgPass } from "@/wab/server/util/pgpass-util";
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDatabaseUser1769472633819 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const { username, password } =
      extractUsernameAndPasswordFromPgPass("wabro");
    if (!password) {
      console.warn("Skipping user creation: password not found in pgpass");
      return;
    }

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${username}') THEN
          CREATE USER ${username} WITH PASSWORD '${password}';
          RAISE NOTICE 'User ${username} created successfully';
        ELSE
          RAISE NOTICE 'User ${username} already exists';
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'wabro') THEN
          DROP USER wabro;
          RAISE NOTICE 'User wabro dropped successfully';
        ELSE
          RAISE NOTICE 'User wabro does not exist';
        END IF;
      END
      $$;
    `);
  }
}
