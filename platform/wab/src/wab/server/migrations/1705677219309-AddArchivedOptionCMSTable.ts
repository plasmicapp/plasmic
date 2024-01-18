import { MigrationInterface, QueryRunner } from "typeorm";

export class AddArchivedOptionCMSTable1705677219309
  implements MigrationInterface
{
  name = "AddArchivedOptionCMSTable1705677219309";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cms_table" ADD "isArchived" boolean`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cms_table" DROP COLUMN "isArchived"`);
  }
}
