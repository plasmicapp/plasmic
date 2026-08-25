import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveTutorialDb1787554380000 implements MigrationInterface {
  name = "RemoveTutorialDb1787554380000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "data_source_operation"
       WHERE "dataSourceId" IN (
         SELECT "id" FROM "data_source" WHERE "source" = 'tutorialdb'
       )`
    );
    await queryRunner.query(
      `DELETE FROM "data_source_allowed_projects"
       WHERE "dataSourceId" IN (
         SELECT "id" FROM "data_source" WHERE "source" = 'tutorialdb'
       )`
    );
    await queryRunner.query(
      `DELETE FROM "data_source" WHERE "source" = 'tutorialdb'`
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "tutorial_db"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "tutorial_db" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "info" jsonb NOT NULL, CONSTRAINT "PK_b725f44ad85177e4f6c5f78297d" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `ALTER TABLE "tutorial_db" ADD CONSTRAINT "FK_4f29c51c46938baf77f035a7ed1" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "tutorial_db" ADD CONSTRAINT "FK_e18dbd85bc69b85077cb83b16e4" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "tutorial_db" ADD CONSTRAINT "FK_2f6b28725a6025e203480c365ec" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }
}
