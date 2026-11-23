import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFeatureTierAllowances1794528000000 implements MigrationInterface {
  name = "AddFeatureTierAllowances1794528000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "feature_tier" ADD "monthlyAiCreditsPerSeat" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "feature_tier" ADD "monthlyCdnGb" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "team" ADD "monthlyAiCredits" integer`,
    );
    await queryRunner.query(`ALTER TABLE "team" ADD "monthlyCdnGb" integer`);
    await queryRunner.query(
      `ALTER TABLE "team" ADD "billingCycleAnchor" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "team" DROP COLUMN "billingCycleAnchor"`,
    );
    await queryRunner.query(`ALTER TABLE "team" DROP COLUMN "monthlyCdnGb"`);
    await queryRunner.query(
      `ALTER TABLE "team" DROP COLUMN "monthlyAiCredits"`,
    );
    await queryRunner.query(
      `ALTER TABLE "feature_tier" DROP COLUMN "monthlyCdnGb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "feature_tier" DROP COLUMN "monthlyAiCreditsPerSeat"`,
    );
  }
}
