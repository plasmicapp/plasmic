import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPromotionCodeTrialDays1698424344476
  implements MigrationInterface
{
  name = "AddPromotionCodeTrialDays1698424344476";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "promotion_code" ADD "trialDays" integer NOT NULL DEFAULT 60`
    );
    await queryRunner.query(
      `ALTER TABLE "promotion_code" ALTER COLUMN "trialDays" DROP DEFAULT`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "promotion_code" DROP COLUMN "trialDays"`
    );
  }
}
