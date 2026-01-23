import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPkgVersionUniqueIndexes1769194653000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pkg_version_pkgId_version_not_deleted" ON public.pkg_version USING btree ("pkgId", version) WHERE ("branchId" IS NULL AND "deletedAt" IS NULL)`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_pkg_version_pkgId_branchId_version_not_deleted" ON public.pkg_version USING btree ("pkgId", "branchId", version) WHERE ("branchId" IS NOT NULL AND "deletedAt" IS NULL)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_pkg_version_pkgId_branchId_version_not_deleted"`
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_pkg_version_pkgId_version_not_deleted"`
    );
  }
}
