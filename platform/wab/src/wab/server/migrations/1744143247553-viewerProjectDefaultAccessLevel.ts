import { MigrationInterface, QueryRunner } from "typeorm";

export class viewerProjectDefaultAccessLevel1744143247553
  implements MigrationInterface
{
  name = "viewerProjectDefaultAccessLevel1744143247553";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "project"
      SET "defaultAccessLevel" = 'viewer'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
