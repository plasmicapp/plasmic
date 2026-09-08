import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserFreeTrialStartedAt1788327057614
  implements MigrationInterface
{
  name = "AddUserFreeTrialStartedAt1788327057614";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "freeTrialStartedAt" TIMESTAMP WITH TIME ZONE`
    );
    await queryRunner.query(
      `UPDATE "user" u
       SET "freeTrialStartedAt" = t."firstTrial"
       FROM (
         SELECT "createdById", MIN("trialStartDate") AS "firstTrial"
         FROM "team"
         WHERE "trialStartDate" IS NOT NULL AND "createdById" IS NOT NULL
         GROUP BY "createdById"
       ) t
       WHERE t."createdById" = u.id`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "freeTrialStartedAt"`
    );
  }
}
