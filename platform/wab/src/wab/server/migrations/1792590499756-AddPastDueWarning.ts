import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPastDueWarning1792590499756 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "subscription_status" ADD COLUMN "blockWarningSentAt" timestamptz`,
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "subscription_status" DROP COLUMN "blockWarningSentAt"`,
    );
  }
}
