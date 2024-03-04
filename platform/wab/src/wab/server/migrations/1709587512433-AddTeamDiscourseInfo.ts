import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTeamDiscourseInfo implements MigrationInterface {
  name = "AddTeamDiscourseInfo1709587512433";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "team_discourse_info" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "teamId" text NOT NULL, "slug" text NOT NULL, "name" text NOT NULL, "categoryId" integer NOT NULL, "groupId" integer NOT NULL, CONSTRAINT "PK_270acd7bee50c7032f243c2d771" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_8a2128f864c7d7695e1291d855" ON "team_discourse_info" ("teamId") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_d229b4e8d9715bd3aaebc3ca94" ON "team_discourse_info" ("slug") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e25b9da89cfae6a87de74fb3f6" ON "team_discourse_info" ("name") `
    );
    await queryRunner.query(
      `ALTER TABLE "team_discourse_info" ADD CONSTRAINT "FK_cafe1b6187365363bd9e3ffd712" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "team_discourse_info" ADD CONSTRAINT "FK_8d022023b3424289d8223171195" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "team_discourse_info" ADD CONSTRAINT "FK_97403795d074cb63f672059271c" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "team_discourse_info" DROP CONSTRAINT "FK_97403795d074cb63f672059271c"`
    );
    await queryRunner.query(
      `ALTER TABLE "team_discourse_info" DROP CONSTRAINT "FK_8d022023b3424289d8223171195"`
    );
    await queryRunner.query(
      `ALTER TABLE "team_discourse_info" DROP CONSTRAINT "FK_cafe1b6187365363bd9e3ffd712"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e25b9da89cfae6a87de74fb3f6"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d229b4e8d9715bd3aaebc3ca94"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8a2128f864c7d7695e1291d855"`
    );
    await queryRunner.query(`DROP TABLE "team_discourse_info"`);
  }
}
