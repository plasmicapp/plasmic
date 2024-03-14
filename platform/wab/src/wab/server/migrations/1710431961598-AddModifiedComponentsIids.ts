import { MigrationInterface, QueryRunner } from "typeorm";

export class AddModifiedComponentsIids1710431961598
  implements MigrationInterface
{
  name = "AddModifiedComponentsIids1710431961598";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "partial_revision_cache" ADD "modifiedComponentIids" text array`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "partial_revision_cache" DROP COLUMN "modifiedComponentIids"`
    );
  }
}
