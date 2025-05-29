import { MigrationInterface, QueryRunner } from "typeorm";

export class AddincludeChangeDataProjectWebhook1744228506646
  implements MigrationInterface
{
  name = "AddincludeChangeDataProjectWebhook1744228506646";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_webhook" ADD "includeChangeData" boolean`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_webhook" DROP COLUMN "includeChangeData"`
    );
  }
}
