import { MigrationInterface, QueryRunner } from "typeorm";

// Team table was not altered since prod already has
// personalTeamOwner_fk and personalTeamOwnerId_index
// See https://coda.io/d/Plasmic-Wiki_dHQygjmQczq/Prod-vs-local-test-database-differences_su4nx#_lut0w
export class FixOneToOneRelations1709948487432 implements MigrationInterface {
  name = "FixOneToOneRelations1709948487432";

  public async up(queryRunner: QueryRunner): Promise<void> {
    //await queryRunner.query(
    //  `ALTER TABLE "team" ADD CONSTRAINT "UQ_250950015142683e6bea5c07018" UNIQUE ("personalTeamOwnerId")`
    //);
    await queryRunner.query(
      `ALTER TABLE "saml_config" ADD CONSTRAINT "UQ_cb722b89d8a37ae2c5c7770f7b2" UNIQUE ("teamId")`
    );
    await queryRunner.query(
      `ALTER TABLE "sso_config" ADD CONSTRAINT "UQ_a093781d5d4a8c8e47d94ad03ab" UNIQUE ("teamId")`
    );
    await queryRunner.query(
      `ALTER TABLE "team_discourse_info" ADD CONSTRAINT "UQ_8a2128f864c7d7695e1291d855b" UNIQUE ("teamId")`
    );
    //await queryRunner.query(
    //  `ALTER TABLE "team" ADD CONSTRAINT "FK_250950015142683e6bea5c07018" FOREIGN KEY ("personalTeamOwnerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    //);
    await queryRunner.query(
      `ALTER TABLE "saml_config" ADD CONSTRAINT "FK_cb722b89d8a37ae2c5c7770f7b2" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "sso_config" ADD CONSTRAINT "FK_a093781d5d4a8c8e47d94ad03ab" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "team_discourse_info" ADD CONSTRAINT "FK_8a2128f864c7d7695e1291d855b" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "team_discourse_info" DROP CONSTRAINT "FK_8a2128f864c7d7695e1291d855b"`
    );
    await queryRunner.query(
      `ALTER TABLE "sso_config" DROP CONSTRAINT "FK_a093781d5d4a8c8e47d94ad03ab"`
    );
    await queryRunner.query(
      `ALTER TABLE "saml_config" DROP CONSTRAINT "FK_cb722b89d8a37ae2c5c7770f7b2"`
    );
    //await queryRunner.query(
    //  `ALTER TABLE "team" DROP CONSTRAINT "FK_250950015142683e6bea5c07018"`
    //);
    await queryRunner.query(
      `ALTER TABLE "team_discourse_info" DROP CONSTRAINT "UQ_8a2128f864c7d7695e1291d855b"`
    );
    await queryRunner.query(
      `ALTER TABLE "sso_config" DROP CONSTRAINT "UQ_a093781d5d4a8c8e47d94ad03ab"`
    );
    await queryRunner.query(
      `ALTER TABLE "saml_config" DROP CONSTRAINT "UQ_cb722b89d8a37ae2c5c7770f7b2"`
    );
    //await queryRunner.query(
    //  `ALTER TABLE "team" DROP CONSTRAINT "UQ_250950015142683e6bea5c07018"`
    //);
  }
}
