import { MigrationInterface, QueryRunner } from "typeorm";

export class AllowUserStarters1704769097223 implements MigrationInterface {
  name = "AllowUserStarters1704769097223";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" ADD "isUserStarter" boolean`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" DROP COLUMN "isUserStarter"`
    );
  }
}
