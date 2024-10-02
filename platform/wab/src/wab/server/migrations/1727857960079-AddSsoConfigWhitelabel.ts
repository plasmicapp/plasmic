import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSsoConfigWhitelabel1727857960079 implements MigrationInterface {
  name = "AddSsoConfigWhitelabel1727857960079";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sso_config" ADD "whitelabelConfig" jsonb`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sso_config" DROP COLUMN "whitelabelConfig"`
    );
  }
}
