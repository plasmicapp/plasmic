import { MigrationInterface, QueryRunner } from "typeorm";

export class DeleteUnusedAuthTables1723178120224 implements MigrationInterface {
  name = "DeleteUnusedAuthTables1723178120224";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "saml_config" DROP CONSTRAINT "FK_cb722b89d8a37ae2c5c7770f7b2"`
    );
    await queryRunner.query(
      `ALTER TABLE "saml_config" DROP CONSTRAINT "FK_761d4ae832a171678ad7d754e40"`
    );
    await queryRunner.query(
      `ALTER TABLE "saml_config" DROP CONSTRAINT "FK_f0e88885500b000f9cad1286d8a"`
    );
    await queryRunner.query(
      `ALTER TABLE "saml_config" DROP CONSTRAINT "FK_d2f8c610db8c9f536dd034258a5"`
    );
    await queryRunner.query(
      `ALTER TABLE "userless_oauth_token" DROP CONSTRAINT "FK_3fc754d25a443657e5a6c628fa4"`
    );
    await queryRunner.query(
      `ALTER TABLE "userless_oauth_token" DROP CONSTRAINT "FK_5488ba47ed200338434a0c67dfe"`
    );
    await queryRunner.query(
      `ALTER TABLE "userless_oauth_token" DROP CONSTRAINT "FK_112a3d9d1c9c3cafeff16611cc4"`
    );
    await queryRunner.query(
      `ALTER TABLE "userless_oauth_token" DROP CONSTRAINT "FK_1087c8203cfea09f4f2072dee01"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2c339c724a5ff9c6811011a76a"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_005c00c000020743507c64c643"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cb722b89d8a37ae2c5c7770f7b"`
    );
    await queryRunner.query(`DROP TABLE "saml_config"`);
    await queryRunner.query(`DROP TABLE "userless_oauth_token"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "userless_oauth_token" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "provider" text NOT NULL, "userInfo" jsonb NOT NULL, "token" jsonb NOT NULL, "ssoConfigId" text, "email" text NOT NULL, CONSTRAINT "PK_d1b01ee0f615b238561e6b63901" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "saml_config" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "teamId" text NOT NULL, "domains" text array NOT NULL, "entrypoint" text NOT NULL, "issuer" text NOT NULL, "cert" text NOT NULL, "tenantId" text NOT NULL, CONSTRAINT "REL_cb722b89d8a37ae2c5c7770f7b" UNIQUE ("teamId"), CONSTRAINT "PK_ab6b25b488e250a539eeedcf926" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cb722b89d8a37ae2c5c7770f7b" ON "saml_config" ("teamId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_005c00c000020743507c64c643" ON "saml_config" ("domains") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2c339c724a5ff9c6811011a76a" ON "saml_config" ("tenantId") `
    );
    await queryRunner.query(
      `ALTER TABLE "userless_oauth_token" ADD CONSTRAINT "FK_1087c8203cfea09f4f2072dee01" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "userless_oauth_token" ADD CONSTRAINT "FK_112a3d9d1c9c3cafeff16611cc4" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "userless_oauth_token" ADD CONSTRAINT "FK_5488ba47ed200338434a0c67dfe" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "userless_oauth_token" ADD CONSTRAINT "FK_3fc754d25a443657e5a6c628fa4" FOREIGN KEY ("ssoConfigId") REFERENCES "sso_config"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "saml_config" ADD CONSTRAINT "FK_d2f8c610db8c9f536dd034258a5" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "saml_config" ADD CONSTRAINT "FK_f0e88885500b000f9cad1286d8a" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "saml_config" ADD CONSTRAINT "FK_761d4ae832a171678ad7d754e40" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "saml_config" ADD CONSTRAINT "FK_cb722b89d8a37ae2c5c7770f7b2" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }
}
