import { MigrationInterface, QueryRunner } from "typeorm";

export class ThreadBasedCommentSchema1738188738589
  implements MigrationInterface
{
  name = "ThreadBasedCommentSchema1738188738589";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM comment`);

    await queryRunner.query(
      `ALTER TABLE "comment" DROP CONSTRAINT "FK_61e5bdd38addac8d6219ca102ee"`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" DROP CONSTRAINT "FK_afb44e65ab30fdb5f97185b6dbd"`
    );
    await queryRunner.query(`DROP INDEX "public"."PROJECT_AND_BRANCH_IDX"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f7f39dec77c39953338d2701ae"`
    );
    await queryRunner.query(
      `CREATE TABLE "comment_thread" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "projectId" text NOT NULL, "branchId" text, "location" jsonb NOT NULL, "resolved" boolean NOT NULL DEFAULT false, "lastEmailedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_be68531edd9305c665090a8a389" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "PROJECT_AND_BRANCH_IDX" ON "comment_thread" ("projectId", "branchId") `
    );
    await queryRunner.query(
      `CREATE TABLE "comment_thread_history" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "commentThreadId" text NOT NULL, "resolved" boolean NOT NULL, CONSTRAINT "PK_dcdafa58d33cda8f5a7497001ae" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a47175eecb8442a0652dc74553" ON "comment_thread_history" ("commentThreadId") `
    );
    await queryRunner.query(`ALTER TABLE "comment" DROP COLUMN "resolved"`);
    await queryRunner.query(`ALTER TABLE "comment" DROP COLUMN "location"`);
    await queryRunner.query(
      `ALTER TABLE "comment" DROP COLUMN "isEmailNotificationSent"`
    );
    await queryRunner.query(`ALTER TABLE "comment" DROP COLUMN "threadId"`);
    await queryRunner.query(`ALTER TABLE "comment" DROP COLUMN "projectId"`);
    await queryRunner.query(`ALTER TABLE "comment" DROP COLUMN "branchId"`);
    await queryRunner.query(
      `ALTER TABLE "comment" ADD "commentThreadId" text NOT NULL`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_189762055a3caa7409f57d9750" ON "comment" ("commentThreadId") `
    );
    await queryRunner.query(
      `ALTER TABLE "comment_thread" ADD CONSTRAINT "FK_fe17f4e9d76c4b97ef3fe9b9685" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_thread" ADD CONSTRAINT "FK_403962396687f03ad752481e977" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_thread" ADD CONSTRAINT "FK_4f8b120634e56fa1a782ff51e78" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_thread" ADD CONSTRAINT "FK_845aa78a63f5509e2277a46b422" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_thread" ADD CONSTRAINT "FK_e157b469a93274d07c15ea86759" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD CONSTRAINT "FK_189762055a3caa7409f57d97504" FOREIGN KEY ("commentThreadId") REFERENCES "comment_thread"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_thread_history" ADD CONSTRAINT "FK_9fd783b82ca150db8d2067593bb" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_thread_history" ADD CONSTRAINT "FK_373817b5b08977c1fc94e6f52a8" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_thread_history" ADD CONSTRAINT "FK_ebaab97e65455c49458548e353b" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_thread_history" ADD CONSTRAINT "FK_a47175eecb8442a0652dc74553e" FOREIGN KEY ("commentThreadId") REFERENCES "comment_thread"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM comment_thread`);

    await queryRunner.query(
      `ALTER TABLE "comment_thread_history" DROP CONSTRAINT "FK_a47175eecb8442a0652dc74553e"`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_thread_history" DROP CONSTRAINT "FK_ebaab97e65455c49458548e353b"`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_thread_history" DROP CONSTRAINT "FK_373817b5b08977c1fc94e6f52a8"`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_thread_history" DROP CONSTRAINT "FK_9fd783b82ca150db8d2067593bb"`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" DROP CONSTRAINT "FK_189762055a3caa7409f57d97504"`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_thread" DROP CONSTRAINT "FK_e157b469a93274d07c15ea86759"`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_thread" DROP CONSTRAINT "FK_845aa78a63f5509e2277a46b422"`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_thread" DROP CONSTRAINT "FK_4f8b120634e56fa1a782ff51e78"`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_thread" DROP CONSTRAINT "FK_403962396687f03ad752481e977"`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_thread" DROP CONSTRAINT "FK_fe17f4e9d76c4b97ef3fe9b9685"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_189762055a3caa7409f57d9750"`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" DROP COLUMN "commentThreadId"`
    );
    await queryRunner.query(`ALTER TABLE "comment" ADD "branchId" text`);
    await queryRunner.query(
      `ALTER TABLE "comment" ADD "projectId" text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD "threadId" text NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD "isEmailNotificationSent" boolean NOT NULL DEFAULT false`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD "location" jsonb NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD "resolved" boolean NOT NULL DEFAULT false`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a47175eecb8442a0652dc74553"`
    );
    await queryRunner.query(`DROP TABLE "comment_thread_history"`);
    await queryRunner.query(`DROP INDEX "public"."PROJECT_AND_BRANCH_IDX"`);
    await queryRunner.query(`DROP TABLE "comment_thread"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_f7f39dec77c39953338d2701ae" ON "comment" ("threadId") `
    );
    await queryRunner.query(
      `CREATE INDEX "PROJECT_AND_BRANCH_IDX" ON "comment" ("projectId", "branchId") `
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD CONSTRAINT "FK_afb44e65ab30fdb5f97185b6dbd" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD CONSTRAINT "FK_61e5bdd38addac8d6219ca102ee" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }
}
