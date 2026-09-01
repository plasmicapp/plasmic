import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUsageProviderModel1787156381264 implements MigrationInterface {
  name = "AddUsageProviderModel1787156381264";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usage" ADD "provider" text`);
    await queryRunner.query(`ALTER TABLE "usage" ADD "model" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usage" DROP COLUMN "model"`);
    await queryRunner.query(`ALTER TABLE "usage" DROP COLUMN "provider"`);
  }
}
