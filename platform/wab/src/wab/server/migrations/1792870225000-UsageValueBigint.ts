import { MigrationInterface, QueryRunner } from "typeorm";

/** Loader byte totals can exceed the 32-bit integer range. */
export class UsageValueBigint1792870225000 implements MigrationInterface {
  name = "UsageValueBigint1792870225000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usage" ALTER COLUMN "value" TYPE bigint`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usage" ALTER COLUMN "value" TYPE integer`,
    );
  }
}
