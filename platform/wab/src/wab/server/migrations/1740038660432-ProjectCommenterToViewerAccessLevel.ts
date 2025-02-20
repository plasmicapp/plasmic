import { MigrationInterface, QueryRunner } from "typeorm";

export class ProjectCommenterToViewerAccessLevel1740038660432
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE "permission"
            SET "accessLevel" = 'viewer'
            WHERE "accessLevel" = 'commenter'
        `);

    await queryRunner.query(`
      UPDATE "project"
      SET "defaultAccessLevel" = 'viewer'
      WHERE "defaultAccessLevel" = 'commenter'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE "permission"
            SET "accessLevel" = 'commenter'
            WHERE "accessLevel" = 'viewer'
        `);

    await queryRunner.query(`
      UPDATE "project"
      SET "defaultAccessLevel" = 'commenter'
      WHERE "defaultAccessLevel" = 'viewer'
    `);
  }
}
