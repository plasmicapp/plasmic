import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsEmailNotificationSent1732615838679
  implements MigrationInterface
{
  name = "AddIsEmailNotificationSent1732615838679";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the column with a default value of false
    await queryRunner.query(
      `ALTER TABLE "comment" ADD "isEmailNotificationSent" boolean NOT NULL DEFAULT false`
    );

    // Update existing rows to have the value true
    await queryRunner.query(
      `UPDATE "comment" SET "isEmailNotificationSent" = true`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "comment" DROP COLUMN "isEmailNotificationSent"`
    );
  }
}
