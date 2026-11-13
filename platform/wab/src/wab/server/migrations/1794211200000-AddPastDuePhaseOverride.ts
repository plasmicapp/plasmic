import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPastDuePhaseOverride1794211200000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "subscription_status" ADD COLUMN "past_due_phase_override" text`,
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(
      `ALTER TABLE "subscription_status" DROP COLUMN "past_due_phase_override"`,
    );
  }
}
