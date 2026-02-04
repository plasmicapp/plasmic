import { MigrationInterface, QueryRunner } from "typeorm";

export class DbRolesAndGrants1770145899268 implements MigrationInterface {
  name = "DbRolesAndGrants1770145899268";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wabro') THEN
    EXECUTE format('GRANT pg_read_all_data TO %I', 'wabro');
  END IF;
END
$$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wabro') THEN
    EXECUTE format('REVOKE pg_read_all_data FROM %I', 'wabro');
  END IF;
END
$$;`);
  }
}
