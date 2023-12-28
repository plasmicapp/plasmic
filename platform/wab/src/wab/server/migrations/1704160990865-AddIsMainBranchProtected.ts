import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsMainBranchProtected1704160990865
  implements MigrationInterface
{
  name = "AddIsMainBranchProtected1704160990865";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" ADD "isMainBranchProtected" boolean`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" DROP COLUMN "isMainBranchProtected"`
    );
  }
}
