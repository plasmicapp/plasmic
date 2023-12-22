import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIndexToComments1703261008058 implements MigrationInterface {
  name = "AddIndexToComments1703261008058";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "PROJECT_AND_BRANCH_IDX" ON "comment" ("projectId", "branchId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_88bb607240417f03c0592da682" ON "comment_reaction" ("commentId") `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_88bb607240417f03c0592da682"`
    );
    await queryRunner.query(`DROP INDEX "public"."PROJECT_AND_BRANCH_IDX"`);
  }
}
