import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUsageTable1751923704105 implements MigrationInterface {
  name = "AddUsageTable1751923704105";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "usage" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "type" text NOT NULL, "value" integer NOT NULL, "teamId" text, "userId" text, "date" date NOT NULL, "range" tstzrange NOT NULL, CONSTRAINT "CHK_2aefc5ece89fdc383c749e5faf" CHECK ("teamId" is not null OR "userId" is not null), CONSTRAINT "PK_7bc33e71ab6c3b71eac72950b44" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9732ef97715e4503b13b6c763e" ON "usage" ("teamId", "userId", "date") `
    );
    await queryRunner.query(
      `ALTER TABLE "usage" ADD CONSTRAINT "FK_e5f4a5b919b5693b750407fe3d8" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "usage" ADD CONSTRAINT "FK_6e6abef8f91b66942461028827f" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "usage" ADD CONSTRAINT "FK_9d7474b6304df8360b7b12a5b74" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usage" DROP CONSTRAINT "FK_9d7474b6304df8360b7b12a5b74"`
    );
    await queryRunner.query(
      `ALTER TABLE "usage" DROP CONSTRAINT "FK_6e6abef8f91b66942461028827f"`
    );
    await queryRunner.query(
      `ALTER TABLE "usage" DROP CONSTRAINT "FK_e5f4a5b919b5693b750407fe3d8"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9732ef97715e4503b13b6c763e"`
    );
    await queryRunner.query(`DROP TABLE "usage"`);
  }
}
