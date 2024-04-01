import { MigrationInterface, QueryRunner } from "typeorm";

export class IndexRevisionDataLength1711994066440
  implements MigrationInterface
{
  name = "IndexRevisionDataLength1711994066440";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_revision" ADD "dataLength" integer`
    );
    await queryRunner.query(
      `ALTER TABLE "pkg_version" ADD "modelLength" integer`
    );

    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY "IDX_a6c699a994fb0dc07fed6bed66" ON "project_revision" ("dataLength") `
    );
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY "IDX_eccdba1b0e2ec9663f3f783f0d" ON "pkg_version" ("modelLength") `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY "public"."IDX_eccdba1b0e2ec9663f3f783f0d"`
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY "public"."IDX_a6c699a994fb0dc07fed6bed66"`
    );
    await queryRunner.query(
      `ALTER TABLE "pkg_version" DROP COLUMN "modelLength"`
    );
    await queryRunner.query(
      `ALTER TABLE "project_revision" DROP COLUMN "dataLength"`
    );
  }
}
