import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveUnusedProjectColumns1740442929878
  implements MigrationInterface
{
  name = "RemoveUnusedProjectColumns1740442929878";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project" DROP CONSTRAINT "FK_fe67adbc435f2864cf458df7c33"`
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP COLUMN "codeSandboxInfos"`
    );
    await queryRunner.query(`ALTER TABLE "project" DROP COLUMN "orgId"`);
    await queryRunner.query(
      `ALTER TABLE "project" DROP COLUMN "codeSandboxId"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "project" ADD "codeSandboxId" text`);
    await queryRunner.query(`ALTER TABLE "project" ADD "orgId" text`);
    await queryRunner.query(
      `ALTER TABLE "project" ADD "codeSandboxInfos" jsonb`
    );
    await queryRunner.query(
      `ALTER TABLE "project" ADD CONSTRAINT "FK_fe67adbc435f2864cf458df7c33" FOREIGN KEY ("orgId") REFERENCES "org"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }
}
