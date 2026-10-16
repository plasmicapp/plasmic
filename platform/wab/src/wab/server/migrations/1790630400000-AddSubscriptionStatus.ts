import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSubscriptionStatus1790630400000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "subscription_status" (
      "id" text PRIMARY KEY, "createdAt" timestamptz NOT NULL, "updatedAt" timestamptz NOT NULL,
      "deletedAt" timestamptz, "createdById" text REFERENCES "user"("id"),
      "updatedById" text REFERENCES "user"("id"), "deletedById" text REFERENCES "user"("id"),
      "teamId" text NOT NULL REFERENCES "team"("id") ON DELETE CASCADE,
      "stripeSubscriptionId" text, "status" text NOT NULL
    )`);
    await q.query(
      `CREATE INDEX "subscription_status_team_updated" ON "subscription_status" ("teamId", "updatedAt" DESC)`,
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "subscription_status"`);
  }
}
