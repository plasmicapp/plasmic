import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHostingTextFiles1789034400000 implements MigrationInterface {
  name = "AddHostingTextFiles1789034400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "plasmic_hosting_settings" ADD "textFiles" jsonb`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "plasmic_hosting_settings" DROP COLUMN "textFiles"`
    );
  }
}
