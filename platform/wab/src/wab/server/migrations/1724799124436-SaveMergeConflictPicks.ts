import { MigrationInterface, QueryRunner } from "typeorm";

export class SaveMergeConflictPicks1724799124436 implements MigrationInterface {
  name = "SaveMergeConflictPicks1724799124436";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pkg_version" ADD "conflictPickMap" text`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "pkg_version" DROP COLUMN "conflictPickMap"`
    );
  }
}
