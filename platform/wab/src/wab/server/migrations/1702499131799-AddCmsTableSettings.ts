import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCmsTableSettings1702499131799 implements MigrationInterface {
  name = "AddCmsTableSettings1702499131799";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cms_table" ADD "settings" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cms_table" DROP COLUMN "settings"`);
  }
}
