import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterProjectRevisionDataCompression1778255940000
  implements MigrationInterface
{
  name = "AlterProjectRevisionDataCompression1778255940000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_revision" ALTER COLUMN "data" SET COMPRESSION lz4`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_revision" ALTER COLUMN "data" SET COMPRESSION pglz`
    );
  }
}
