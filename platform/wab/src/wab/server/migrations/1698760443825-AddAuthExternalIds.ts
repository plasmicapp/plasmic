import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuthExternalIds1698760443825 implements MigrationInterface {
  name = "AddAuthExternalIds1698760443825";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "end_user" ADD "externalId" text`);
    await queryRunner.query(
      `ALTER TABLE "app_end_user_access" ADD "externalId" text`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_access" ADD "manuallyAdded" boolean NOT NULL DEFAULT true`
    );
    await queryRunner.query(
      `ALTER TABLE "end_user" ALTER COLUMN "email" DROP NOT NULL`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_afd59a807a5bdd663ff4b53a14" ON "end_user" ("externalId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a8fbefd202b486f99d30b933df" ON "app_end_user_access" ("externalId") `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a8fbefd202b486f99d30b933df"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_afd59a807a5bdd663ff4b53a14"`
    );
    await queryRunner.query(
      `ALTER TABLE "end_user" ALTER COLUMN "email" SET NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_access" DROP COLUMN "manuallyAdded"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_access" DROP COLUMN "externalId"`
    );
    await queryRunner.query(`ALTER TABLE "end_user" DROP COLUMN "externalId"`);
  }
}
