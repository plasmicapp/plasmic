import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserSignUpPromotionCode1710102143652
  implements MigrationInterface
{
  name = "AddUserSignUpPromotionCode1710102143652";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "signUpPromotionCodeId" text`
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_f25c1f94bb527428b237363a9ef" FOREIGN KEY ("signUpPromotionCodeId") REFERENCES "promotion_code"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_f25c1f94bb527428b237363a9ef"`
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "signUpPromotionCodeId"`
    );
  }
}
