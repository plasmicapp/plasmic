import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProjectUiConfig1716819274756 implements MigrationInterface {
  name = "AddProjectUiConfig1716819274756";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "project" ADD "uiConfig" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "uiConfig"`);
  }
}
