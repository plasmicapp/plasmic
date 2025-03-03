import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCommentSchemaIndexes1740086288784
  implements MigrationInterface
{
  name = "AddCommentSchemaIndexes1740086288784";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_d7d9238507135fa0ed9a5f33f3" ON "comment_thread" ("lastEmailedAt") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_be2297303525f1748ac006c4e0" ON "comment_thread" ("createdAt") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6938fb9a688586bbb8e4e1b3fc" ON "comment_thread" ("updatedAt") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3edd3cdb7232a3e9220607eabb" ON "comment" ("createdAt") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5eb0d701cfac21d7fba78a3819" ON "comment_reaction" ("createdAt") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1b656a79e9543fb5ae490b33a4" ON "comment_thread_history" ("createdAt") `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1b656a79e9543fb5ae490b33a4"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5eb0d701cfac21d7fba78a3819"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3edd3cdb7232a3e9220607eabb"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6938fb9a688586bbb8e4e1b3fc"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_be2297303525f1748ac006c4e0"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d7d9238507135fa0ed9a5f33f3"`
    );
  }
}
