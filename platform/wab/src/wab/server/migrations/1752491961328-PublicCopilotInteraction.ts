import { MigrationInterface, QueryRunner } from "typeorm";

export class PublicCopilotInteraction1752491961328
  implements MigrationInterface
{
  name = "PublicCopilotInteraction1752491961328";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "public_copilot_interaction" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "userPrompt" text NOT NULL, "response" text NOT NULL, "fullPromptSnapshot" text NOT NULL, "model" text NOT NULL, CONSTRAINT "PK_6cc689974ce6c812588d8ff8f95" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `ALTER TABLE "public_copilot_interaction" ADD CONSTRAINT "FK_6de036c890d97883dae528073f2" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "public_copilot_interaction" ADD CONSTRAINT "FK_44092605d2f527db35b6983aa14" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "public_copilot_interaction" ADD CONSTRAINT "FK_d4dd9f5e0cabed7c7fbe80f75b2" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "public_copilot_interaction" DROP CONSTRAINT "FK_d4dd9f5e0cabed7c7fbe80f75b2"`
    );
    await queryRunner.query(
      `ALTER TABLE "public_copilot_interaction" DROP CONSTRAINT "FK_44092605d2f527db35b6983aa14"`
    );
    await queryRunner.query(
      `ALTER TABLE "public_copilot_interaction" DROP CONSTRAINT "FK_6de036c890d97883dae528073f2"`
    );
    await queryRunner.query(`DROP TABLE "public_copilot_interaction"`);
  }
}
