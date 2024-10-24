import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeCommentSchema1729805882051 implements MigrationInterface {
  name = "ChangeCommentSchema1729805882051";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`TRUNCATE TABLE "comment_reaction" CASCADE`);
    await queryRunner.query(`TRUNCATE TABLE "comment" CASCADE`);
    await queryRunner.query(`ALTER TABLE "comment" DROP COLUMN "data"`);
    await queryRunner.query(
      `ALTER TABLE "comment" ADD "resolved" boolean NOT NULL DEFAULT false`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD "location" jsonb NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE "comment" ADD "body" text NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "comment" ADD "threadId" text NOT NULL`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f7f39dec77c39953338d2701ae" ON "comment" ("threadId") `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f7f39dec77c39953338d2701ae"`
    );
    await queryRunner.query(`ALTER TABLE "comment" DROP COLUMN "threadId"`);
    await queryRunner.query(`ALTER TABLE "comment" DROP COLUMN "body"`);
    await queryRunner.query(`ALTER TABLE "comment" DROP COLUMN "location"`);
    await queryRunner.query(`ALTER TABLE "comment" DROP COLUMN "resolved"`);
    await queryRunner.query(`ALTER TABLE "comment" ADD "data" jsonb`);
  }
}
