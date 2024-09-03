import { MigrationInterface, QueryRunner } from "typeorm";

export class AddParentTeamIdIndex1725380418530 implements MigrationInterface {
  name = "AddParentTeamIdIndex1725380418530";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_bb0c8fe5c1b1a2087b4420ae3f" ON "team" ("parentTeamId") `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bb0c8fe5c1b1a2087b4420ae3f"`
    );
  }
}
