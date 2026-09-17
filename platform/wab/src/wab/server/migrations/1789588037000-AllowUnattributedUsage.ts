import { MigrationInterface, QueryRunner } from "typeorm";

/** Anonymous copilot usage has neither a team nor a user to attribute to. */
export class AllowUnattributedUsage1789588037000 implements MigrationInterface {
  name = "AllowUnattributedUsage1789588037000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usage" DROP CONSTRAINT "CHK_2aefc5ece89fdc383c749e5faf"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "usage" WHERE "teamId" IS NULL AND "userId" IS NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "usage" ADD CONSTRAINT "CHK_2aefc5ece89fdc383c749e5faf" CHECK ("teamId" is not null OR "userId" is not null)`
    );
  }
}
