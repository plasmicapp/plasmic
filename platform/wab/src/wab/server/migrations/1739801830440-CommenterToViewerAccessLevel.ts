import { MigrationInterface, QueryRunner } from "typeorm";

export class CommenterToViewerAccessLevel1739801830440
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE "permission"
            SET "accessLevel" = 'viewer'
            WHERE "accessLevel" = 'commenter'
        `);

    await queryRunner.query(`
      UPDATE "team"
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
      UPDATE "team"
      SET "defaultAccessLevel" = 'commenter'
      WHERE "defaultAccessLevel" = 'viewer'
    `);
  }
}
