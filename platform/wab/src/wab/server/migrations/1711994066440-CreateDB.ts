import { MigrationInterface, QueryRunner } from "typeorm";

export class IndexRevisionDataLength1711994066440
  implements MigrationInterface
{
  name = "IndexRevisionDataLength1711994066440";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "express_session" ("expiredAt" bigint NOT NULL, "id" character varying(255) NOT NULL, "json" text NOT NULL, CONSTRAINT "PK_60c081b7dbfcceb94f7845c7c97" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_294be58e675b784fa211b6a151" ON "express_session" ("expiredAt") `
    );
    await queryRunner.query(
      `CREATE TABLE "org" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "name" text NOT NULL, "domain" text, CONSTRAINT "UQ_64ca4c7f7746d2e0ab0dd146cd7" UNIQUE ("domain"), CONSTRAINT "PK_703783130f152a752cadf7aa751" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "team" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "name" text NOT NULL, "billingEmail" text NOT NULL, "personalTeamOwnerId" text, "seats" integer, "featureTierId" text, "stripeCustomerId" text, "stripeSubscriptionId" text, "billingFrequency" text, "trialStartDate" TIMESTAMP WITH TIME ZONE, "trialDays" integer, "inviteId" text, "defaultAccessLevel" text, "whiteLabelName" text, "whiteLabelInfo" jsonb, "uiConfig" jsonb, "parentTeamId" text, CONSTRAINT "REL_250950015142683e6bea5c0701" UNIQUE ("personalTeamOwnerId"), CONSTRAINT "PK_f57d8293406df4af348402e4b74" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_365fdc8b9d557274d6f3489a8b" ON "team" ("whiteLabelName") `
    );
    await queryRunner.query(
      `CREATE TABLE "workspace" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "name" text NOT NULL, "description" text NOT NULL, "teamId" text NOT NULL, "uiConfig" jsonb, "contentCreatorConfig" jsonb, CONSTRAINT "PK_ca86b6f9b3be5fe26d307d09b49" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4d1eceef7e5f8e70fe3ead745d" ON "workspace" ("teamId") `
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "orgId" text, "firstName" text, "lastName" text, "role" text, "source" text, "surveyResponse" jsonb, "needsSurvey" boolean NOT NULL, "waitingEmailVerification" boolean, "adminModeDisabled" boolean, "needsTeamCreationPrompt" boolean, "email" text NOT NULL, "bcrypt" text NOT NULL, "permanentlyDeletedAt" TIMESTAMP WITH TIME ZONE, "avatarUrl" text, "needsIntroSplash" boolean NOT NULL, "extraData" text, "owningTeamId" text, "isWhiteLabel" boolean, "whiteLabelId" text, "whiteLabelInfo" jsonb, "signUpPromotionCodeId" text, CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e12875dfb3b1d92d7d7c5377e2" ON "user" ("email") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_db634d6f46b18685dc209a69cf" ON "user" ("owningTeamId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_43b86bfb43aa4310fcf84d1381" ON "user" ("owningTeamId", "whiteLabelId") `
    );
    await queryRunner.query(
      `CREATE TABLE "project" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "orgId" text, "name" text NOT NULL, "inviteOnly" boolean NOT NULL, "defaultAccessLevel" text NOT NULL, "hostUrl" text, "clonedFromProjectId" text, "projectApiToken" text, "secretApiToken" text, "codeSandboxId" text, "codeSandboxInfos" jsonb, "readableByPublic" boolean NOT NULL, "uiConfig" jsonb, "workspaceId" text, "extraData" jsonb, "permanentlyDeletedAt" TIMESTAMP WITH TIME ZONE, "isMainBranchProtected" boolean, "isUserStarter" boolean, CONSTRAINT "PK_4d68b1358bb5b766d3e78f32f57" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c224ab17df530651e53a398ed9" ON "project" ("workspaceId") `
    );
    await queryRunner.query(
      `CREATE TABLE "branch" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "orgId" text, "name" text NOT NULL, "projectId" text NOT NULL, "status" text NOT NULL DEFAULT 'active', "hostUrl" text, CONSTRAINT "PK_2e39f426e2faefdaa93c5961976" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1f4dabba86c5e82bc777d2e2c4" ON "branch" ("projectId") `
    );
    await queryRunner.query(
      `CREATE TABLE "project_revision" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "projectId" text NOT NULL, "branchId" text, "data" text NOT NULL, "revision" integer NOT NULL, "dataLength" integer, CONSTRAINT "PK_ae26a6b82863a424e39d6156675" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a6c699a994fb0dc07fed6bed66" ON "project_revision" ("dataLength") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c0118354bf74579507a0bb3d69" ON "project_revision" ("projectId", "branchId", "revision") WHERE "branchId" is not null`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e633c2a71b2587dc1c1db44b43" ON "project_revision" ("projectId", "revision") WHERE "branchId" is null`
    );
    await queryRunner.query(
      `CREATE TABLE "partial_revision_cache" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "projectId" text NOT NULL, "branchId" text, "data" text NOT NULL, "deletedIids" text NOT NULL, "revision" integer NOT NULL, "modifiedComponentIids" text array, "projectRevisionId" text NOT NULL, CONSTRAINT "PK_c09183cb7cf85ca0288e69e1da2" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e3f33013cdae4bc00066919600" ON "partial_revision_cache" ("projectRevisionId") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_571dafe7d600c38346797415c4" ON "partial_revision_cache" ("projectId", "branchId", "revision") WHERE "branchId" is not null`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_4c902c70a3fba5024b4f7501e8" ON "partial_revision_cache" ("projectId", "revision") WHERE "branchId" is null`
    );
    await queryRunner.query(
      `CREATE TABLE "project_webhook" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "projectId" text NOT NULL, "method" text NOT NULL, "url" text NOT NULL, "headers" jsonb NOT NULL, "payload" text NOT NULL, CONSTRAINT "PK_41b2b31407368a601d249eb2a32" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "project_webhook_event" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "projectId" text NOT NULL, "method" text NOT NULL, "url" text NOT NULL, "status" integer NOT NULL, "response" text NOT NULL, CONSTRAINT "PK_816a2736d69603e20474cd0a038" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "project_repository" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "projectId" text NOT NULL, "userId" text NOT NULL, "installationId" integer NOT NULL, "repository" text NOT NULL, "directory" text NOT NULL, "defaultAction" text NOT NULL, "defaultBranch" text NOT NULL, "scheme" text NOT NULL, "platform" text NOT NULL, "language" text NOT NULL, "cachedCname" text, "publish" boolean NOT NULL, "createdByPlasmic" boolean NOT NULL, CONSTRAINT "PK_5c2d14c08324d914d5b91f9124b" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a7fe8e7574e92150277e996737" ON "project_repository" ("projectId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_78457684e4bbb0211c95c147d2" ON "project_repository" ("userId") `
    );
    await queryRunner.query(
      `CREATE TABLE "trusted_host" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "userId" text NOT NULL, "hostUrl" text NOT NULL, CONSTRAINT "PK_307353a7255dac6ebb94853fd98" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7e3fbe58d720196e079865cb1f" ON "trusted_host" ("userId") `
    );
    await queryRunner.query(
      `CREATE TABLE "reset_password" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "forUserId" text, "secret" text NOT NULL, "used" boolean NOT NULL, CONSTRAINT "PK_82bffbeb85c5b426956d004a8f5" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_adc68d3bbd882b60fb367318ba" ON "reset_password" ("forUserId") `
    );
    await queryRunner.query(
      `CREATE TABLE "email_verification" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "forUserId" text, "secret" text NOT NULL, "used" boolean NOT NULL, CONSTRAINT "PK_b985a8362d9dac51e3d6120d40e" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_003b1154143246f0b3e91772c7" ON "email_verification" ("forUserId") `
    );
    await queryRunner.query(
      `CREATE TABLE "pkg" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "name" text NOT NULL, "sysname" text, "projectId" text, CONSTRAINT "PK_86add2a46bc8d6eec61c5e0985c" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_89277ee9bdc41aa5de5028221d" ON "pkg" ("sysname") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bab2ace4fd065dc129e8fb1c5d" ON "pkg" ("projectId") `
    );
    await queryRunner.query(
      `CREATE TABLE "pkg_version" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "pkgId" text, "branchId" text, "version" text NOT NULL, "model" text NOT NULL, "modelLength" integer, "hostUrl" text, "tags" text array NOT NULL, "description" text, "revisionId" text NOT NULL, "isPrefilled" boolean, CONSTRAINT "PK_945b3cbfcd1372a064638635f9b" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fdd9c21c7215c136cc92c0f550" ON "pkg_version" ("pkgId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eccdba1b0e2ec9663f3f783f0d" ON "pkg_version" ("modelLength") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_54a198af92cb0ef5e9747a4782" ON "pkg_version" ("revisionId") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c57e578dfa2b25690f98e0e867" ON "pkg_version" ("pkgId", "branchId", "version") WHERE "branchId" is not null`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_42d8ba30ffa7c1f3b65d21a9f7" ON "pkg_version" ("pkgId", "version") WHERE "branchId" is null`
    );
    await queryRunner.query(
      `CREATE TABLE "loader_publishment" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "projectId" text NOT NULL, "projectIds" text array NOT NULL, "platform" text NOT NULL, "loaderVersion" integer, "browserOnly" boolean, "i18nKeyScheme" text, "i18nTagPrefix" text, "appDir" boolean, CONSTRAINT "PK_aef3e35f8ad05524b710e75c0aa" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f2b1e2523765b216ea5b83fee4" ON "loader_publishment" ("projectId") `
    );
    await queryRunner.query(
      `CREATE TABLE "oauth_token" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "provider" text NOT NULL, "userInfo" jsonb NOT NULL, "token" jsonb NOT NULL, "ssoConfigId" text, "userId" text NOT NULL, CONSTRAINT "UQ_3dcd7b4f2eb03401f63ffc7f1b8" UNIQUE ("userId", "provider"), CONSTRAINT "PK_7e6a25a3cc4395d1658f5b89c73" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "userless_oauth_token" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "provider" text NOT NULL, "userInfo" jsonb NOT NULL, "token" jsonb NOT NULL, "ssoConfigId" text, "email" text NOT NULL, CONSTRAINT "PK_d1b01ee0f615b238561e6b63901" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "personal_api_token" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "userId" text NOT NULL, "token" text NOT NULL, CONSTRAINT "PK_bfe0b4a6756807615862e3e3a69" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8233506f3285ba3bf0a8d68966" ON "personal_api_token" ("userId") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_bc3c96ea4e6a272c9ce5d685fd" ON "personal_api_token" ("token") `
    );
    await queryRunner.query(
      `CREATE TABLE "team_api_token" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "teamId" text NOT NULL, "token" text NOT NULL, CONSTRAINT "PK_8fbfe658e7c442fb2554aee2eab" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6ffc24586b63fdad873ec49f75" ON "team_api_token" ("teamId") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_d063520eea36f3f39955aceb2e" ON "team_api_token" ("token") `
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_team_api_token" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "teamId" text NOT NULL, "fromTeamTokenId" text NOT NULL, "token" text NOT NULL, CONSTRAINT "PK_85ccacf7fcf0d792bd4170c30d5" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aa82ebb6134471696705a680b1" ON "temporary_team_api_token" ("teamId") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2d2e88da1f72501bb949764f3f" ON "temporary_team_api_token" ("token") `
    );
    await queryRunner.query(
      `CREATE TABLE "permission" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "projectId" text, "workspaceId" text, "teamId" text, "userId" text, "email" text, "accessLevel" text NOT NULL, CONSTRAINT "CHK_33c72294ef598bb705acaf2f4f" CHECK (("projectId" is not null)::int + ("workspaceId" is not null)::int + ("teamId" is not null)::int = 1), CONSTRAINT "CHK_a38b2afbe45310dbef12cd69b3" CHECK (("userId" is not null) <> ("email" is not null)), CONSTRAINT "PK_3b8b97af9d9d8807e41e6f48362" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6a1548bdf4d27c9df5a8442bfc" ON "permission" ("projectId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8926eed7579b5d49cf31a1dc5c" ON "permission" ("workspaceId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4ff15ccf9e648f5255bd9f71a0" ON "permission" ("teamId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c60570051d297d8269fcdd9bc4" ON "permission" ("userId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5fa0994c9a11e5d8c8abbb1855" ON "permission" ("email") `
    );
    await queryRunner.query(
      `CREATE TABLE "sign_up_attempt" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "email" text NOT NULL, CONSTRAINT "PK_eee7bfced3beca5fe224ec57c10" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "project_sync_metadata" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "projectRevId" text NOT NULL, "projectId" text NOT NULL, "revision" integer NOT NULL, "data" text NOT NULL, CONSTRAINT "UQ_e084ec28fff3c711abfe8cde9e2" UNIQUE ("projectId", "revision"), CONSTRAINT "PK_1254075574b73c147dc8500d8ee" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fcbcd401fc78cbbd1d59c75a3d" ON "project_sync_metadata" ("projectRevId") `
    );
    await queryRunner.query(
      `CREATE TABLE "dev_flag_overrides" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "data" text NOT NULL, CONSTRAINT "PK_d0ac64f32db6396618fbaea81e2" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "bundle_backup" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "rowType" text NOT NULL, "migrationName" text NOT NULL, "pkgVersionId" text, "projectRevisionId" text, "projectId" text, "data" text NOT NULL, CONSTRAINT "PK_9bebdcc835d0c32d5cc79a2c5e5" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b86367f314717b31a5a8a257f6" ON "bundle_backup" ("migrationName") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8268076a91662f36de6552e840" ON "bundle_backup" ("projectRevisionId") `
    );
    await queryRunner.query(
      `CREATE TABLE "feature_tier" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "name" text NOT NULL, "monthlySeatPrice" integer NOT NULL, "monthlySeatStripePriceId" text NOT NULL, "monthlyBasePrice" integer, "monthlyBaseStripePriceId" text, "annualSeatPrice" integer NOT NULL, "annualSeatStripePriceId" text NOT NULL, "annualBasePrice" integer, "annualBaseStripePriceId" text, "minUsers" integer NOT NULL DEFAULT '0', "maxUsers" integer, "privateUsersIncluded" integer, "maxPrivateUsers" integer, "publicUsersIncluded" integer, "maxPublicUsers" integer, "designerRole" boolean NOT NULL, "contentRole" boolean NOT NULL, "editContentCreatorMode" boolean NOT NULL DEFAULT false, "splitContent" boolean NOT NULL DEFAULT false, "localization" boolean NOT NULL DEFAULT false, "versionHistoryDays" integer, "maxWorkspaces" integer, "monthlyViews" integer NOT NULL DEFAULT '1000000000', "analytics" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_c5eb7d881df9e06cb4415721298" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "data_source" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "workspaceId" text NOT NULL, "name" text NOT NULL, "credentials" jsonb NOT NULL, "source" text NOT NULL, "settings" jsonb NOT NULL, CONSTRAINT "PK_9775f6b6312a926ed37d3af7d95" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_681a540b285006616d46b0b136" ON "data_source" ("workspaceId") `
    );
    await queryRunner.query(
      `CREATE TABLE "data_source_operation" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "dataSourceId" text NOT NULL, "operationInfo" jsonb NOT NULL, CONSTRAINT "PK_e93de43f622c7d50785cd27bce8" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_44c5db509085b134bac04511ed" ON "data_source_operation" ("dataSourceId") `
    );
    await queryRunner.query(
      `CREATE TABLE "saml_config" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "teamId" text NOT NULL, "domains" text array NOT NULL, "entrypoint" text NOT NULL, "issuer" text NOT NULL, "cert" text NOT NULL, "tenantId" text NOT NULL, CONSTRAINT "REL_cb722b89d8a37ae2c5c7770f7b" UNIQUE ("teamId"), CONSTRAINT "PK_ab6b25b488e250a539eeedcf926" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cb722b89d8a37ae2c5c7770f7b" ON "saml_config" ("teamId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_005c00c000020743507c64c643" ON "saml_config" ("domains") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2c339c724a5ff9c6811011a76a" ON "saml_config" ("tenantId") `
    );
    await queryRunner.query(
      `CREATE TABLE "sso_config" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "teamId" text NOT NULL, "domains" text array NOT NULL, "ssoType" text NOT NULL, "provider" text NOT NULL, "tenantId" text NOT NULL, "config" jsonb NOT NULL, CONSTRAINT "REL_a093781d5d4a8c8e47d94ad03a" UNIQUE ("teamId"), CONSTRAINT "PK_46ebf2f27144083b888ccd995c7" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a093781d5d4a8c8e47d94ad03a" ON "sso_config" ("teamId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ef6cc05f69224a3e57db568272" ON "sso_config" ("domains") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_42ac9294c4fad3c1cce491286e" ON "sso_config" ("tenantId") `
    );
    await queryRunner.query(
      `CREATE TABLE "generic_key_value" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "namespace" text NOT NULL, "key" text NOT NULL, "value" text NOT NULL, CONSTRAINT "PK_aeb627864d98b4e99315c45ce9c" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6b16cfbbab5d24092507d13820" ON "generic_key_value" ("namespace", "key") `
    );
    await queryRunner.query(
      `CREATE TABLE "generic_pair" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "namespace" text NOT NULL, "left" text NOT NULL, "right" text NOT NULL, CONSTRAINT "PK_1a4681c2e8a4a1227ed56de3145" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_75b1a80bd153b429c4b2a5611d" ON "generic_pair" ("namespace", "right") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7a9713347efa162c414562d195" ON "generic_pair" ("namespace", "left") `
    );
    await queryRunner.query(
      `CREATE TABLE "copilot_usage" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, CONSTRAINT "PK_d310fdd37ca31cc6d6a7f23c962" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c989c7f8a2a79c73eb5b267ea9" ON "copilot_usage" ("createdById") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_71de3eb73b78306b45ddf14ca1" ON "copilot_usage" ("createdAt") `
    );
    await queryRunner.query(
      `CREATE TABLE "copilot_interaction" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "userPrompt" text NOT NULL, "response" text NOT NULL, "fullPromptSnapshot" text NOT NULL, "model" text NOT NULL, "projectId" text NOT NULL, "feedback" boolean, "feedbackDescription" text, CONSTRAINT "PK_d13979c52330e5a50a2f54676a0" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_610fad45a27578b833f9cd8f9e" ON "copilot_interaction" ("projectId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a32020acce73939756053d0ca1" ON "copilot_interaction" ("createdById") `
    );
    await queryRunner.query(
      `CREATE TABLE "cms_database" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "name" text NOT NULL, "workspaceId" text NOT NULL, "extraData" jsonb NOT NULL, "publicToken" text NOT NULL, "secretToken" text NOT NULL, CONSTRAINT "PK_8faf63d235a5bcfb415f28d0e81" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0c206d940e5b8f08cd7dd85d31" ON "cms_database" ("workspaceId") `
    );
    await queryRunner.query(
      `CREATE TABLE "cms_table" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "identifier" text NOT NULL, "name" text NOT NULL, "description" text, "schema" jsonb NOT NULL, "databaseId" text NOT NULL, "settings" jsonb, "isArchived" boolean, CONSTRAINT "PK_0575ee0d99368646da72dcb5f93" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f3a4276992d60a7971cbdc215c" ON "cms_table" ("identifier") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8b972b2ee2be09519e2715b4b6" ON "cms_table" ("databaseId") `
    );
    await queryRunner.query(
      `CREATE TABLE "cms_row" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "identifier" text, "tableId" text NOT NULL, "rank" text NOT NULL, "data" jsonb, "draftData" jsonb, "revision" integer, CONSTRAINT "PK_67587c7496ac76dffe2822b4a47" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_055a0d004271a6044e9685a114" ON "cms_row" ("identifier") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5532a342e2b74f2c1c441315f4" ON "cms_row" ("tableId") `
    );
    await queryRunner.query(
      `CREATE TABLE "cms_row_revision" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "rowId" text NOT NULL, "data" jsonb NOT NULL, "isPublished" boolean NOT NULL, CONSTRAINT "PK_10714ea30d048767231a95bc78c" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "workspace_api_token" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "workspaceId" text NOT NULL, "token" text NOT NULL, CONSTRAINT "PK_4a84925839fbdcb3fa4d6aaf51d" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7468d86fef98c8c0c6cab773a1" ON "workspace_api_token" ("workspaceId") `
    );
    await queryRunner.query(
      `CREATE TABLE "workspace_auth_config" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "workspaceId" text NOT NULL, "provider" text, "config" jsonb NOT NULL, CONSTRAINT "PK_ce32476e77bd32279b25a835f8e" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bcae49884012aa70b2bd3a0a29" ON "workspace_auth_config" ("workspaceId") `
    );
    await queryRunner.query(
      `CREATE TABLE "workspace_user" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "workspaceId" text NOT NULL, "userId" text NOT NULL, "email" text NOT NULL, "roles" text array NOT NULL, "properties" jsonb, "token" text NOT NULL, CONSTRAINT "PK_a09cff0ab849da007d391eb9284" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c0c0d4527c85db43fce8740df6" ON "workspace_user" ("workspaceId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ee0d54b3d049b16a596d0be61d" ON "workspace_user" ("userId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_79bd381227f69aac86c8ef416e" ON "workspace_user" ("email") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3a4bcc1c5c3b3d91ea61f1a150" ON "workspace_user" ("token") `
    );
    await queryRunner.query(
      `CREATE TABLE "hostless_version" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "versionCount" integer NOT NULL, CONSTRAINT "PK_8ef8c19c2744ba722acc271f3ee" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "comment" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "projectId" text NOT NULL, "branchId" text, "data" jsonb NOT NULL, CONSTRAINT "PK_0b0e4bbc8415ec426f87f3a88e2" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "PROJECT_AND_BRANCH_IDX" ON "comment" ("projectId", "branchId") `
    );
    await queryRunner.query(
      `CREATE TABLE "comment_reaction" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "commentId" text NOT NULL, "data" jsonb NOT NULL, CONSTRAINT "PK_87f27d282c06eb61b1e0cde2d24" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_88bb607240417f03c0592da682" ON "comment_reaction" ("commentId") `
    );
    await queryRunner.query(
      `CREATE TABLE "end_user_directory" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "teamId" text NOT NULL, "name" text, "config" jsonb NOT NULL, "token" text NOT NULL, CONSTRAINT "PK_d8ea460a76be0d50fc9417a2c14" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_be3e38a27721d428db95018b09" ON "end_user_directory" ("token") `
    );
    await queryRunner.query(
      `CREATE TABLE "directory_end_user_group" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "directoryId" text NOT NULL, "name" text NOT NULL, CONSTRAINT "PK_78f0cd87e2fe3dae5a75d15c06f" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f4f947970d01395600ef96a6ad" ON "directory_end_user_group" ("directoryId") `
    );
    await queryRunner.query(
      `CREATE TABLE "end_user" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "directoryId" text NOT NULL, "email" text, "externalId" text, "userId" text, "properties" jsonb NOT NULL, CONSTRAINT "PK_189d43b9ce928ec96c0899c1cf5" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_df0fc89c523bbc473ae3afdc0d" ON "end_user" ("directoryId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ea98d74e1c1fbd0c34c3769f52" ON "end_user" ("email") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_afd59a807a5bdd663ff4b53a14" ON "end_user" ("externalId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2a795b27f84082d8a7d2d3583f" ON "end_user" ("userId") `
    );
    await queryRunner.query(
      `CREATE TABLE "app_auth_config" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "projectId" text NOT NULL, "directoryId" text NOT NULL, "redirectUri" text, "authScreenProperties" jsonb, "anonymousRoleId" text, "registeredRoleId" text, "provider" text, "token" text, "redirectUris" text array NOT NULL DEFAULT '{}', "userPropsOpId" text, "userPropsDataSourceId" text, "userPropsBundledOp" text, CONSTRAINT "PK_4e3a08697837f23f1a3bfa8c19c" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8aa0806140c1ecb89796ad865e" ON "app_auth_config" ("projectId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ab88a34b5ace106f2258708691" ON "app_auth_config" ("directoryId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1c5c84b27655c28bbd23352437" ON "app_auth_config" ("anonymousRoleId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a058972da8bf44ce5dc1dcd25f" ON "app_auth_config" ("registeredRoleId") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7afa6ec828f0e23580f7ccbf97" ON "app_auth_config" ("token") `
    );
    await queryRunner.query(
      `CREATE TABLE "app_role" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "projectId" text NOT NULL, "name" text NOT NULL, "order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_6247c97e5e63af6c5d6cc8a5e3c" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2b8b28efea573ca75fc0208876" ON "app_role" ("projectId") `
    );
    await queryRunner.query(
      `CREATE TABLE "issued_code" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "code" text NOT NULL, CONSTRAINT "PK_1e41ac9930cced0918bdaecb4cb" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e9fe54c0ebf13c3c0db71d1e2d" ON "issued_code" ("code") `
    );
    await queryRunner.query(
      `CREATE TABLE "app_end_user_access" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "projectId" text NOT NULL, "domain" text, "email" text, "externalId" text, "directoryEndUserGroupId" text, "roleId" text NOT NULL, "manuallyAdded" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_9266fdee95bdb2b822e51341209" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e539a99d0191131ec41ac092b5" ON "app_end_user_access" ("projectId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_249b809ab5161656981b1ee0b6" ON "app_end_user_access" ("domain") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8bc08861aa1ff42a2d6afd8e2c" ON "app_end_user_access" ("email") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a8fbefd202b486f99d30b933df" ON "app_end_user_access" ("externalId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ab69768c857fae791f200d8f4c" ON "app_end_user_access" ("directoryEndUserGroupId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_04b492ac3632bedb8ab5e6cd40" ON "app_end_user_access" ("roleId") `
    );
    await queryRunner.query(
      `CREATE TABLE "app_end_user_group" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "endUserId" text NOT NULL, "directoryEndUserGroupId" text NOT NULL, CONSTRAINT "PK_1a68526f0e7e6e8419483cec547" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_771ec5427dfbe9d6e4f41798e4" ON "app_end_user_group" ("endUserId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_60f728bb5bb635e9c971b0641d" ON "app_end_user_group" ("directoryEndUserGroupId") `
    );
    await queryRunner.query(
      `CREATE TABLE "app_access_registry" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "projectId" text NOT NULL, "endUserId" text NOT NULL, CONSTRAINT "PK_0ea9e855659ca63e93cdf668a90" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_71147186f2f14113fa0c789ad7" ON "app_access_registry" ("projectId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_788cf7fdc2be27aebfa0508a98" ON "app_access_registry" ("endUserId") `
    );
    await queryRunner.query(
      `CREATE TABLE "tutorial_db" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "info" jsonb NOT NULL, CONSTRAINT "PK_b725f44ad85177e4f6c5f78297d" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "promotion_code" ("id" text NOT NULL, "message" text NOT NULL, "trialDays" integer NOT NULL, "expirationDate" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_c8f0e92fe164ab3e9fd126a025c" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "data_source_allowed_projects" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "dataSourceId" text NOT NULL, "projectId" text NOT NULL, CONSTRAINT "PK_28f511ef427a21c6d01737d4f4e" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d5195662fd6274a8350d561c56" ON "data_source_allowed_projects" ("dataSourceId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_039283d243fc2a877052b1523c" ON "data_source_allowed_projects" ("projectId") `
    );
    await queryRunner.query(
      `CREATE TABLE "team_discourse_info" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "teamId" text NOT NULL, "slug" text NOT NULL, "name" text NOT NULL, "categoryId" integer NOT NULL, "groupId" integer NOT NULL, CONSTRAINT "REL_8a2128f864c7d7695e1291d855" UNIQUE ("teamId"), CONSTRAINT "PK_270acd7bee50c7032f243c2d771" PRIMARY KEY ("id"))`
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
      `CREATE TABLE "plasmic_hosting_settings" ("id" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "deletedAt" TIMESTAMP WITH TIME ZONE, "createdById" text, "updatedById" text, "deletedById" text, "projectId" text NOT NULL, "favicon" jsonb, CONSTRAINT "PK_60b970b5d3b637bb297c688e72b" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3af75f9ec3a39b90d0f0749813" ON "plasmic_hosting_settings" ("projectId") `
    );
    await queryRunner.query(
      `ALTER TABLE "org" ADD CONSTRAINT "FK_4223d3778857d70a5a56bf695c7" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "org" ADD CONSTRAINT "FK_8e182d7c15e48c39ff89a7595f8" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "org" ADD CONSTRAINT "FK_521d29ec4880242946002ab9cc9" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "team" ADD CONSTRAINT "FK_3a93fbdeba4e1e9e47fec6bada9" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "team" ADD CONSTRAINT "FK_3152d46f0ce8751aca92399783d" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "team" ADD CONSTRAINT "FK_a740aada0e5c9ed5b6344897706" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "team" ADD CONSTRAINT "FK_250950015142683e6bea5c07018" FOREIGN KEY ("personalTeamOwnerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "team" ADD CONSTRAINT "FK_bd8c00e60bbc2aa52dfebef3251" FOREIGN KEY ("featureTierId") REFERENCES "feature_tier"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "team" ADD CONSTRAINT "FK_bb0c8fe5c1b1a2087b4420ae3fa" FOREIGN KEY ("parentTeamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace" ADD CONSTRAINT "FK_fb730da36fb79e21e8fa5f2c303" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace" ADD CONSTRAINT "FK_7a88c01f91d572187ff58ee4bcd" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace" ADD CONSTRAINT "FK_4961cf337b086f3bcbc68d54562" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace" ADD CONSTRAINT "FK_4d1eceef7e5f8e70fe3ead745d9" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_45c0d39d1f9ceeb56942db93cc5" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_db5173f7d27aa8a98a9fe6113df" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_c3062c4102a912dfe7195a72bfb" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_4f5adb58513c2fe57eb9c79cc16" FOREIGN KEY ("orgId") REFERENCES "org"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD CONSTRAINT "FK_f25c1f94bb527428b237363a9ef" FOREIGN KEY ("signUpPromotionCodeId") REFERENCES "promotion_code"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project" ADD CONSTRAINT "FK_678acfe7017fe8a25fe7cae5f18" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project" ADD CONSTRAINT "FK_dfdad0cd83b31ccb2204f3dc688" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project" ADD CONSTRAINT "FK_69b474c75777a1f7ac5551e8e26" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project" ADD CONSTRAINT "FK_fe67adbc435f2864cf458df7c33" FOREIGN KEY ("orgId") REFERENCES "org"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project" ADD CONSTRAINT "FK_c224ab17df530651e53a398ed92" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "branch" ADD CONSTRAINT "FK_c8b6e72ddfdd41e7ff256b21658" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "branch" ADD CONSTRAINT "FK_c3254ff11158f942a808f3ba344" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "branch" ADD CONSTRAINT "FK_543fa3f5ab7f0d5d85671f10907" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "branch" ADD CONSTRAINT "FK_2570acf6325f1713958ef845e2c" FOREIGN KEY ("orgId") REFERENCES "org"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "branch" ADD CONSTRAINT "FK_1f4dabba86c5e82bc777d2e2c43" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project_revision" ADD CONSTRAINT "FK_9afb13e88a406695429ae3feb44" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project_revision" ADD CONSTRAINT "FK_19f7c0cafeae58b54c0ac2c805c" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project_revision" ADD CONSTRAINT "FK_ee90236e6c310b450b30f903b91" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project_revision" ADD CONSTRAINT "FK_52a9e1ddd348950d99766c0d07d" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project_revision" ADD CONSTRAINT "FK_da417c69cd6944f548fda45c272" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "partial_revision_cache" ADD CONSTRAINT "FK_3f0b1eb073f9f4cefb803fb88cb" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "partial_revision_cache" ADD CONSTRAINT "FK_8fbe10648c6e0627bfc75d80f87" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "partial_revision_cache" ADD CONSTRAINT "FK_545de270d6edb75e79e8f0d2545" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "partial_revision_cache" ADD CONSTRAINT "FK_b9b4e6b855edec7b6675ded5b73" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "partial_revision_cache" ADD CONSTRAINT "FK_09c0931e1da426a2178dee5787d" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "partial_revision_cache" ADD CONSTRAINT "FK_e3f33013cdae4bc000669196006" FOREIGN KEY ("projectRevisionId") REFERENCES "project_revision"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project_webhook" ADD CONSTRAINT "FK_fd0af95fe9a57ebdab21f317f0e" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project_webhook" ADD CONSTRAINT "FK_5830ead909b6b58127624aebbc0" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project_webhook" ADD CONSTRAINT "FK_6a6894b1f884d4c8dcb442412a2" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project_webhook" ADD CONSTRAINT "FK_67e1210506c4bb32386218d6be8" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project_webhook_event" ADD CONSTRAINT "FK_647d827d9da2ce0052d5c46be30" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project_webhook_event" ADD CONSTRAINT "FK_7766b3265a3c3e12b767335fd50" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project_webhook_event" ADD CONSTRAINT "FK_4e251ce9f5aa4d823bd96e829a0" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project_webhook_event" ADD CONSTRAINT "FK_17bbaf10d39d2a52d246581efe8" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project_repository" ADD CONSTRAINT "FK_4dd24e277daeb279bbe6adcee69" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project_repository" ADD CONSTRAINT "FK_2afe03975927067337ce4fd1754" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project_repository" ADD CONSTRAINT "FK_f90112c8e53eaba7f6c6829bed4" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project_repository" ADD CONSTRAINT "FK_a7fe8e7574e92150277e996737e" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project_repository" ADD CONSTRAINT "FK_78457684e4bbb0211c95c147d25" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "trusted_host" ADD CONSTRAINT "FK_a172c668e113fcbf54f1811eb32" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "trusted_host" ADD CONSTRAINT "FK_09f691b912e9016d65d0933e055" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "trusted_host" ADD CONSTRAINT "FK_47fca9f788fedafd943d1e44cea" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "trusted_host" ADD CONSTRAINT "FK_7e3fbe58d720196e079865cb1fd" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "reset_password" ADD CONSTRAINT "FK_ff283fb3236e001571373ff9dc4" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "reset_password" ADD CONSTRAINT "FK_0204adaf85867cd81a99441bf29" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "reset_password" ADD CONSTRAINT "FK_f43a10d675fb90a27bc76d42dad" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "reset_password" ADD CONSTRAINT "FK_adc68d3bbd882b60fb367318ba5" FOREIGN KEY ("forUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification" ADD CONSTRAINT "FK_0633c7742e1a51d943b9026aab0" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification" ADD CONSTRAINT "FK_7b75696721e15c7fa5dff57e281" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification" ADD CONSTRAINT "FK_cd9ad363c7165bb7b5878d78f14" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification" ADD CONSTRAINT "FK_003b1154143246f0b3e91772c7c" FOREIGN KEY ("forUserId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "pkg" ADD CONSTRAINT "FK_e07e42beb28ffcfc0025fec594a" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "pkg" ADD CONSTRAINT "FK_3c843725df3c090ecad28aaf97c" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "pkg" ADD CONSTRAINT "FK_f59b7c473a230a12996e1373200" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "pkg" ADD CONSTRAINT "FK_bab2ace4fd065dc129e8fb1c5df" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "pkg_version" ADD CONSTRAINT "FK_d007600fcb8eecbaa6ee0a25335" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "pkg_version" ADD CONSTRAINT "FK_e4bdfb459e976fb3c3819eae2c7" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "pkg_version" ADD CONSTRAINT "FK_f4d28e5dc13e32fc1cc07b0acb3" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "pkg_version" ADD CONSTRAINT "FK_fdd9c21c7215c136cc92c0f5502" FOREIGN KEY ("pkgId") REFERENCES "pkg"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "pkg_version" ADD CONSTRAINT "FK_798b567fd1e6eb52c0d34a7d649" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "loader_publishment" ADD CONSTRAINT "FK_01c86898d15d02e40096db99882" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "loader_publishment" ADD CONSTRAINT "FK_721967bfbba778c4f1e18849af9" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "loader_publishment" ADD CONSTRAINT "FK_94a28033134342f724549d16718" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "oauth_token" ADD CONSTRAINT "FK_5ec4a3bf35cce33c021cb5b0961" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "oauth_token" ADD CONSTRAINT "FK_ad6de2e0626b79e0e2d18a6a4ae" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "oauth_token" ADD CONSTRAINT "FK_b70b79b392642aadbb50655e251" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "oauth_token" ADD CONSTRAINT "FK_361f8e7c5a47e3abd54fce16c92" FOREIGN KEY ("ssoConfigId") REFERENCES "sso_config"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "oauth_token" ADD CONSTRAINT "FK_f6b4b1ac66b753feab5d831ba04" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "userless_oauth_token" ADD CONSTRAINT "FK_1087c8203cfea09f4f2072dee01" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "userless_oauth_token" ADD CONSTRAINT "FK_112a3d9d1c9c3cafeff16611cc4" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "userless_oauth_token" ADD CONSTRAINT "FK_5488ba47ed200338434a0c67dfe" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "userless_oauth_token" ADD CONSTRAINT "FK_3fc754d25a443657e5a6c628fa4" FOREIGN KEY ("ssoConfigId") REFERENCES "sso_config"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "personal_api_token" ADD CONSTRAINT "FK_560b77fc7c248491f1c188c2208" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "personal_api_token" ADD CONSTRAINT "FK_0bfed0df56da9260eb1fb0cd85c" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "personal_api_token" ADD CONSTRAINT "FK_150bf9c9c6e997563094e25da01" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "personal_api_token" ADD CONSTRAINT "FK_8233506f3285ba3bf0a8d689667" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "team_api_token" ADD CONSTRAINT "FK_2abcfa006f37f6dc0ff0980e9b8" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "team_api_token" ADD CONSTRAINT "FK_3184c97d06113ff79a349c628bc" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "team_api_token" ADD CONSTRAINT "FK_06e9219ffad5e2debf601f375ef" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "team_api_token" ADD CONSTRAINT "FK_6ffc24586b63fdad873ec49f752" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "temporary_team_api_token" ADD CONSTRAINT "FK_222f5e01e041aef144ae4f3aa33" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "temporary_team_api_token" ADD CONSTRAINT "FK_696eae25247b767b1fe183f5065" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "temporary_team_api_token" ADD CONSTRAINT "FK_7567190e1a841e15b82ff356f6b" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "temporary_team_api_token" ADD CONSTRAINT "FK_aa82ebb6134471696705a680b15" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "permission" ADD CONSTRAINT "FK_00e2c09abd157b5358faf3f43d0" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "permission" ADD CONSTRAINT "FK_40c4877af6e402a449d56af4d39" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "permission" ADD CONSTRAINT "FK_4d0a24c8995ff4940a38208d23a" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "permission" ADD CONSTRAINT "FK_6a1548bdf4d27c9df5a8442bfc2" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "permission" ADD CONSTRAINT "FK_8926eed7579b5d49cf31a1dc5cf" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "permission" ADD CONSTRAINT "FK_4ff15ccf9e648f5255bd9f71a01" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "permission" ADD CONSTRAINT "FK_c60570051d297d8269fcdd9bc47" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "sign_up_attempt" ADD CONSTRAINT "FK_a41e89e9a3bce6651ba52e9221a" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "sign_up_attempt" ADD CONSTRAINT "FK_5a66f723f0b48af4acffa7e4849" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "sign_up_attempt" ADD CONSTRAINT "FK_0e632bed7ce49f4056e8f6076d3" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project_sync_metadata" ADD CONSTRAINT "FK_da4be5efb83ba354f5ae27ed2f9" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project_sync_metadata" ADD CONSTRAINT "FK_a4e52c142adc1150710c67832f2" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "project_sync_metadata" ADD CONSTRAINT "FK_b65d7504b2da8cc1992c30976bb" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "dev_flag_overrides" ADD CONSTRAINT "FK_c7aa72cbaf1c432335d719f2a97" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "dev_flag_overrides" ADD CONSTRAINT "FK_91c7314334a58cf82e25d07c47e" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "dev_flag_overrides" ADD CONSTRAINT "FK_11de50d63ac7c022ee55386487d" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "bundle_backup" ADD CONSTRAINT "FK_6f3d6d693181063ad726139cdc3" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "bundle_backup" ADD CONSTRAINT "FK_29342139cea1d6c0423c93a251d" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "bundle_backup" ADD CONSTRAINT "FK_7d3d591fc555afe4f3ed32b6c03" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "bundle_backup" ADD CONSTRAINT "FK_dff6fc6483b76130e934a1f6671" FOREIGN KEY ("pkgVersionId") REFERENCES "pkg_version"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "bundle_backup" ADD CONSTRAINT "FK_8268076a91662f36de6552e840c" FOREIGN KEY ("projectRevisionId") REFERENCES "project_revision"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "bundle_backup" ADD CONSTRAINT "FK_0f87a35be3e33ae4b0cda6bed7b" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "feature_tier" ADD CONSTRAINT "FK_6c5adb026733d00e41db2f96ae6" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "feature_tier" ADD CONSTRAINT "FK_e19a7cca8167d58af185a113fe7" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "feature_tier" ADD CONSTRAINT "FK_0dd4461f44b4bd23601544aa215" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source" ADD CONSTRAINT "FK_69b41df48f2eb22f03b381a38ad" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source" ADD CONSTRAINT "FK_f4f8c50f70dea5864a7da5a4aa9" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source" ADD CONSTRAINT "FK_cf526f27b3712a6620d62eacbb0" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source" ADD CONSTRAINT "FK_681a540b285006616d46b0b136c" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source_operation" ADD CONSTRAINT "FK_5174dcd70c1bfae3a7419e0c3b1" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source_operation" ADD CONSTRAINT "FK_cc00c2a9a382986369205ebc8c7" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source_operation" ADD CONSTRAINT "FK_9e674090b18da8a093e9a1b8e30" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source_operation" ADD CONSTRAINT "FK_44c5db509085b134bac04511ede" FOREIGN KEY ("dataSourceId") REFERENCES "data_source"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "saml_config" ADD CONSTRAINT "FK_d2f8c610db8c9f536dd034258a5" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "saml_config" ADD CONSTRAINT "FK_f0e88885500b000f9cad1286d8a" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "saml_config" ADD CONSTRAINT "FK_761d4ae832a171678ad7d754e40" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "saml_config" ADD CONSTRAINT "FK_cb722b89d8a37ae2c5c7770f7b2" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "sso_config" ADD CONSTRAINT "FK_82550c9a10e13404f28fd3d6f9f" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "sso_config" ADD CONSTRAINT "FK_eb76070d2678e976220f7785793" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "sso_config" ADD CONSTRAINT "FK_667af3b44850e5168556b456a83" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "sso_config" ADD CONSTRAINT "FK_a093781d5d4a8c8e47d94ad03ab" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "generic_key_value" ADD CONSTRAINT "FK_a01e38e0e764c67ec7b71936c31" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "generic_key_value" ADD CONSTRAINT "FK_5dac0c4d2e8f833a607305c9576" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "generic_key_value" ADD CONSTRAINT "FK_f1e03147ee95d7b1da4c45b9749" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "generic_pair" ADD CONSTRAINT "FK_2167285ba3e03b501c2acd189e7" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "generic_pair" ADD CONSTRAINT "FK_e592a59ec74d13537ebbd2e2aba" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "generic_pair" ADD CONSTRAINT "FK_3756055706697b790335e7dfb97" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "copilot_usage" ADD CONSTRAINT "FK_c989c7f8a2a79c73eb5b267ea9a" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "copilot_usage" ADD CONSTRAINT "FK_11fa0d060b656fb81ca227554b8" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "copilot_usage" ADD CONSTRAINT "FK_b6613a1c30054b9ec9c13c66722" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "copilot_interaction" ADD CONSTRAINT "FK_a32020acce73939756053d0ca1d" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "copilot_interaction" ADD CONSTRAINT "FK_f8c7fecc5597a0df35df52dfe12" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "copilot_interaction" ADD CONSTRAINT "FK_caaded0ae4265a9adc177762f0c" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "copilot_interaction" ADD CONSTRAINT "FK_610fad45a27578b833f9cd8f9ed" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_database" ADD CONSTRAINT "FK_40d84f2bea82711c3f175d60308" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_database" ADD CONSTRAINT "FK_57f98b7d56ab273dbbf7c82f782" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_database" ADD CONSTRAINT "FK_9a5587fd4bb4d1d79594ea83742" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_database" ADD CONSTRAINT "FK_0c206d940e5b8f08cd7dd85d31e" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_table" ADD CONSTRAINT "FK_65bd7269acff00b52730e6524de" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_table" ADD CONSTRAINT "FK_a10ce90bffe11fb003de35b5cf4" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_table" ADD CONSTRAINT "FK_2d478647682d770af3c0ce18722" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_table" ADD CONSTRAINT "FK_8b972b2ee2be09519e2715b4b63" FOREIGN KEY ("databaseId") REFERENCES "cms_database"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_row" ADD CONSTRAINT "FK_d998737aa12474845b3f4a3d4d4" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_row" ADD CONSTRAINT "FK_617c0a8c7437e6fb3e4786b46c9" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_row" ADD CONSTRAINT "FK_1b2b8de8dd0ea03f66f7a63601e" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_row" ADD CONSTRAINT "FK_5532a342e2b74f2c1c441315f41" FOREIGN KEY ("tableId") REFERENCES "cms_table"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_row_revision" ADD CONSTRAINT "FK_3648c20c31980d1e3c955223c82" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_row_revision" ADD CONSTRAINT "FK_87a3608950defe945c96c148ec1" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_row_revision" ADD CONSTRAINT "FK_b89832647db0106fb22e3c98036" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_row_revision" ADD CONSTRAINT "FK_ca5510c0795729d138a94636684" FOREIGN KEY ("rowId") REFERENCES "cms_row"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_api_token" ADD CONSTRAINT "FK_11dc1c43bf75c683f58838b4ca6" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_api_token" ADD CONSTRAINT "FK_a0d8d2672c1b8ca2c0b9af43701" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_api_token" ADD CONSTRAINT "FK_7693a4d6d4f31597dac57459ef6" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_api_token" ADD CONSTRAINT "FK_7468d86fef98c8c0c6cab773a10" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_auth_config" ADD CONSTRAINT "FK_8209bba1bd3cae3ced862dd8325" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_auth_config" ADD CONSTRAINT "FK_8d631d3bfa3cb9e519c004eaabc" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_auth_config" ADD CONSTRAINT "FK_1801e7adff3a6efe07ff5ceeb09" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_auth_config" ADD CONSTRAINT "FK_bcae49884012aa70b2bd3a0a298" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_user" ADD CONSTRAINT "FK_d818a0220c38643263123942d48" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_user" ADD CONSTRAINT "FK_409eafd87a95a20c960930a672f" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_user" ADD CONSTRAINT "FK_e571a1ae8dea508827ebb683b6e" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_user" ADD CONSTRAINT "FK_c0c0d4527c85db43fce8740df63" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "hostless_version" ADD CONSTRAINT "FK_88c9ffa29054e187b57629a0ea1" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "hostless_version" ADD CONSTRAINT "FK_a206982827bcb64d78ec9fe62fd" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "hostless_version" ADD CONSTRAINT "FK_5ae1edd7542ed7d451a8c5a6f7d" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD CONSTRAINT "FK_63ac916757350d28f05c5a6a4ba" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD CONSTRAINT "FK_da4617c781efe652a6f96475335" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD CONSTRAINT "FK_705c9406163927351c6c7444623" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD CONSTRAINT "FK_61e5bdd38addac8d6219ca102ee" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD CONSTRAINT "FK_afb44e65ab30fdb5f97185b6dbd" FOREIGN KEY ("branchId") REFERENCES "branch"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_reaction" ADD CONSTRAINT "FK_ca8ba445d0ccbb9356978de8609" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_reaction" ADD CONSTRAINT "FK_c9cbef4011f64a0d1ad75486c42" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_reaction" ADD CONSTRAINT "FK_528030fee87681214c55ae122bd" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_reaction" ADD CONSTRAINT "FK_88bb607240417f03c0592da6824" FOREIGN KEY ("commentId") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "end_user_directory" ADD CONSTRAINT "FK_ec4df82f522f42055c978cca923" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "end_user_directory" ADD CONSTRAINT "FK_8abe13bebc8a0491439c886f0d7" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "end_user_directory" ADD CONSTRAINT "FK_d500e3efb81d39e79110c237e11" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "end_user_directory" ADD CONSTRAINT "FK_e045156e23aa87242e24328a85e" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "directory_end_user_group" ADD CONSTRAINT "FK_69947a55434008f7556e78c9b47" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "directory_end_user_group" ADD CONSTRAINT "FK_604fca495d2c084a8d6f2f5e79f" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "directory_end_user_group" ADD CONSTRAINT "FK_afeacb404865edeaa747cb6bff3" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "directory_end_user_group" ADD CONSTRAINT "FK_f4f947970d01395600ef96a6ad3" FOREIGN KEY ("directoryId") REFERENCES "end_user_directory"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "end_user" ADD CONSTRAINT "FK_02f280c6273799cfde409527f90" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "end_user" ADD CONSTRAINT "FK_3da12ec46c4dcda0970af231405" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "end_user" ADD CONSTRAINT "FK_123a3c333fbbe6238ed83ef4dbc" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "end_user" ADD CONSTRAINT "FK_df0fc89c523bbc473ae3afdc0d7" FOREIGN KEY ("directoryId") REFERENCES "end_user_directory"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "end_user" ADD CONSTRAINT "FK_2a795b27f84082d8a7d2d3583f2" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_auth_config" ADD CONSTRAINT "FK_60561d43b535bb02543ae66e4a1" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_auth_config" ADD CONSTRAINT "FK_20939b4d89e5f464cb651fd342c" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_auth_config" ADD CONSTRAINT "FK_18efccaf00308eada8c065313b6" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_auth_config" ADD CONSTRAINT "FK_8aa0806140c1ecb89796ad865e7" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_auth_config" ADD CONSTRAINT "FK_ab88a34b5ace106f2258708691d" FOREIGN KEY ("directoryId") REFERENCES "end_user_directory"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_auth_config" ADD CONSTRAINT "FK_1c5c84b27655c28bbd233524377" FOREIGN KEY ("anonymousRoleId") REFERENCES "app_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_auth_config" ADD CONSTRAINT "FK_a058972da8bf44ce5dc1dcd25fb" FOREIGN KEY ("registeredRoleId") REFERENCES "app_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_role" ADD CONSTRAINT "FK_79a579c65d8a48ec23d4d0bbc1f" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_role" ADD CONSTRAINT "FK_97ea6775f31766da5d44270435e" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_role" ADD CONSTRAINT "FK_65261c37fbfbebf98fd85dfa899" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_role" ADD CONSTRAINT "FK_2b8b28efea573ca75fc02088762" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "issued_code" ADD CONSTRAINT "FK_90bc392d1937a2422ac9b8a163c" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "issued_code" ADD CONSTRAINT "FK_1d654bd6f23dcb01b7d373e06d0" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "issued_code" ADD CONSTRAINT "FK_433b6945bfa134a56d097c288a3" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_access" ADD CONSTRAINT "FK_d248996216086f744118185f030" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_access" ADD CONSTRAINT "FK_ac702da9f863ec7bf89cf544787" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_access" ADD CONSTRAINT "FK_df6e21361e2dea47539d3168c06" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_access" ADD CONSTRAINT "FK_e539a99d0191131ec41ac092b5b" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_access" ADD CONSTRAINT "FK_ab69768c857fae791f200d8f4c0" FOREIGN KEY ("directoryEndUserGroupId") REFERENCES "directory_end_user_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_access" ADD CONSTRAINT "FK_04b492ac3632bedb8ab5e6cd409" FOREIGN KEY ("roleId") REFERENCES "app_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_group" ADD CONSTRAINT "FK_c13d2bce684aaef2acf7fe8b5f5" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_group" ADD CONSTRAINT "FK_b90cf607d0a45ad21f051a07ef6" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_group" ADD CONSTRAINT "FK_2c800fb1f1cba8a51671f1d1976" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_group" ADD CONSTRAINT "FK_771ec5427dfbe9d6e4f41798e49" FOREIGN KEY ("endUserId") REFERENCES "end_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_group" ADD CONSTRAINT "FK_60f728bb5bb635e9c971b0641dc" FOREIGN KEY ("directoryEndUserGroupId") REFERENCES "directory_end_user_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_access_registry" ADD CONSTRAINT "FK_323297476653a6f01b211b5ae65" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_access_registry" ADD CONSTRAINT "FK_916f312ddcc2f4eb7cb2afdc500" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_access_registry" ADD CONSTRAINT "FK_5c2be06facd69184ae79db1b1c0" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_access_registry" ADD CONSTRAINT "FK_71147186f2f14113fa0c789ad74" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "app_access_registry" ADD CONSTRAINT "FK_788cf7fdc2be27aebfa0508a98d" FOREIGN KEY ("endUserId") REFERENCES "end_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
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
    await queryRunner.query(
      `ALTER TABLE "data_source_allowed_projects" ADD CONSTRAINT "FK_307ee85508c3cb88244051e5ec4" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source_allowed_projects" ADD CONSTRAINT "FK_70b4e51c632dfa99b9f57c36231" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source_allowed_projects" ADD CONSTRAINT "FK_69f583301695fc9c615a1c47c49" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source_allowed_projects" ADD CONSTRAINT "FK_d5195662fd6274a8350d561c566" FOREIGN KEY ("dataSourceId") REFERENCES "data_source"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source_allowed_projects" ADD CONSTRAINT "FK_039283d243fc2a877052b1523c7" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
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
    await queryRunner.query(
      `ALTER TABLE "team_discourse_info" ADD CONSTRAINT "FK_8a2128f864c7d7695e1291d855b" FOREIGN KEY ("teamId") REFERENCES "team"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "plasmic_hosting_settings" ADD CONSTRAINT "FK_0e8025cab1022dc033f60f096f7" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "plasmic_hosting_settings" ADD CONSTRAINT "FK_1765c90cbbdf6853004b791abe5" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "plasmic_hosting_settings" ADD CONSTRAINT "FK_61ba10225ffed9b9d2bb4be118d" FOREIGN KEY ("deletedById") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "plasmic_hosting_settings" ADD CONSTRAINT "FK_3af75f9ec3a39b90d0f07498131" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "plasmic_hosting_settings" DROP CONSTRAINT "FK_3af75f9ec3a39b90d0f07498131"`
    );
    await queryRunner.query(
      `ALTER TABLE "plasmic_hosting_settings" DROP CONSTRAINT "FK_61ba10225ffed9b9d2bb4be118d"`
    );
    await queryRunner.query(
      `ALTER TABLE "plasmic_hosting_settings" DROP CONSTRAINT "FK_1765c90cbbdf6853004b791abe5"`
    );
    await queryRunner.query(
      `ALTER TABLE "plasmic_hosting_settings" DROP CONSTRAINT "FK_0e8025cab1022dc033f60f096f7"`
    );
    await queryRunner.query(
      `ALTER TABLE "team_discourse_info" DROP CONSTRAINT "FK_8a2128f864c7d7695e1291d855b"`
    );
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
      `ALTER TABLE "data_source_allowed_projects" DROP CONSTRAINT "FK_039283d243fc2a877052b1523c7"`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source_allowed_projects" DROP CONSTRAINT "FK_d5195662fd6274a8350d561c566"`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source_allowed_projects" DROP CONSTRAINT "FK_69f583301695fc9c615a1c47c49"`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source_allowed_projects" DROP CONSTRAINT "FK_70b4e51c632dfa99b9f57c36231"`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source_allowed_projects" DROP CONSTRAINT "FK_307ee85508c3cb88244051e5ec4"`
    );
    await queryRunner.query(
      `ALTER TABLE "tutorial_db" DROP CONSTRAINT "FK_2f6b28725a6025e203480c365ec"`
    );
    await queryRunner.query(
      `ALTER TABLE "tutorial_db" DROP CONSTRAINT "FK_e18dbd85bc69b85077cb83b16e4"`
    );
    await queryRunner.query(
      `ALTER TABLE "tutorial_db" DROP CONSTRAINT "FK_4f29c51c46938baf77f035a7ed1"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_access_registry" DROP CONSTRAINT "FK_788cf7fdc2be27aebfa0508a98d"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_access_registry" DROP CONSTRAINT "FK_71147186f2f14113fa0c789ad74"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_access_registry" DROP CONSTRAINT "FK_5c2be06facd69184ae79db1b1c0"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_access_registry" DROP CONSTRAINT "FK_916f312ddcc2f4eb7cb2afdc500"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_access_registry" DROP CONSTRAINT "FK_323297476653a6f01b211b5ae65"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_group" DROP CONSTRAINT "FK_60f728bb5bb635e9c971b0641dc"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_group" DROP CONSTRAINT "FK_771ec5427dfbe9d6e4f41798e49"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_group" DROP CONSTRAINT "FK_2c800fb1f1cba8a51671f1d1976"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_group" DROP CONSTRAINT "FK_b90cf607d0a45ad21f051a07ef6"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_group" DROP CONSTRAINT "FK_c13d2bce684aaef2acf7fe8b5f5"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_access" DROP CONSTRAINT "FK_04b492ac3632bedb8ab5e6cd409"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_access" DROP CONSTRAINT "FK_ab69768c857fae791f200d8f4c0"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_access" DROP CONSTRAINT "FK_e539a99d0191131ec41ac092b5b"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_access" DROP CONSTRAINT "FK_df6e21361e2dea47539d3168c06"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_access" DROP CONSTRAINT "FK_ac702da9f863ec7bf89cf544787"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_end_user_access" DROP CONSTRAINT "FK_d248996216086f744118185f030"`
    );
    await queryRunner.query(
      `ALTER TABLE "issued_code" DROP CONSTRAINT "FK_433b6945bfa134a56d097c288a3"`
    );
    await queryRunner.query(
      `ALTER TABLE "issued_code" DROP CONSTRAINT "FK_1d654bd6f23dcb01b7d373e06d0"`
    );
    await queryRunner.query(
      `ALTER TABLE "issued_code" DROP CONSTRAINT "FK_90bc392d1937a2422ac9b8a163c"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_role" DROP CONSTRAINT "FK_2b8b28efea573ca75fc02088762"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_role" DROP CONSTRAINT "FK_65261c37fbfbebf98fd85dfa899"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_role" DROP CONSTRAINT "FK_97ea6775f31766da5d44270435e"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_role" DROP CONSTRAINT "FK_79a579c65d8a48ec23d4d0bbc1f"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_auth_config" DROP CONSTRAINT "FK_a058972da8bf44ce5dc1dcd25fb"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_auth_config" DROP CONSTRAINT "FK_1c5c84b27655c28bbd233524377"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_auth_config" DROP CONSTRAINT "FK_ab88a34b5ace106f2258708691d"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_auth_config" DROP CONSTRAINT "FK_8aa0806140c1ecb89796ad865e7"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_auth_config" DROP CONSTRAINT "FK_18efccaf00308eada8c065313b6"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_auth_config" DROP CONSTRAINT "FK_20939b4d89e5f464cb651fd342c"`
    );
    await queryRunner.query(
      `ALTER TABLE "app_auth_config" DROP CONSTRAINT "FK_60561d43b535bb02543ae66e4a1"`
    );
    await queryRunner.query(
      `ALTER TABLE "end_user" DROP CONSTRAINT "FK_2a795b27f84082d8a7d2d3583f2"`
    );
    await queryRunner.query(
      `ALTER TABLE "end_user" DROP CONSTRAINT "FK_df0fc89c523bbc473ae3afdc0d7"`
    );
    await queryRunner.query(
      `ALTER TABLE "end_user" DROP CONSTRAINT "FK_123a3c333fbbe6238ed83ef4dbc"`
    );
    await queryRunner.query(
      `ALTER TABLE "end_user" DROP CONSTRAINT "FK_3da12ec46c4dcda0970af231405"`
    );
    await queryRunner.query(
      `ALTER TABLE "end_user" DROP CONSTRAINT "FK_02f280c6273799cfde409527f90"`
    );
    await queryRunner.query(
      `ALTER TABLE "directory_end_user_group" DROP CONSTRAINT "FK_f4f947970d01395600ef96a6ad3"`
    );
    await queryRunner.query(
      `ALTER TABLE "directory_end_user_group" DROP CONSTRAINT "FK_afeacb404865edeaa747cb6bff3"`
    );
    await queryRunner.query(
      `ALTER TABLE "directory_end_user_group" DROP CONSTRAINT "FK_604fca495d2c084a8d6f2f5e79f"`
    );
    await queryRunner.query(
      `ALTER TABLE "directory_end_user_group" DROP CONSTRAINT "FK_69947a55434008f7556e78c9b47"`
    );
    await queryRunner.query(
      `ALTER TABLE "end_user_directory" DROP CONSTRAINT "FK_e045156e23aa87242e24328a85e"`
    );
    await queryRunner.query(
      `ALTER TABLE "end_user_directory" DROP CONSTRAINT "FK_d500e3efb81d39e79110c237e11"`
    );
    await queryRunner.query(
      `ALTER TABLE "end_user_directory" DROP CONSTRAINT "FK_8abe13bebc8a0491439c886f0d7"`
    );
    await queryRunner.query(
      `ALTER TABLE "end_user_directory" DROP CONSTRAINT "FK_ec4df82f522f42055c978cca923"`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_reaction" DROP CONSTRAINT "FK_88bb607240417f03c0592da6824"`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_reaction" DROP CONSTRAINT "FK_528030fee87681214c55ae122bd"`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_reaction" DROP CONSTRAINT "FK_c9cbef4011f64a0d1ad75486c42"`
    );
    await queryRunner.query(
      `ALTER TABLE "comment_reaction" DROP CONSTRAINT "FK_ca8ba445d0ccbb9356978de8609"`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" DROP CONSTRAINT "FK_afb44e65ab30fdb5f97185b6dbd"`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" DROP CONSTRAINT "FK_61e5bdd38addac8d6219ca102ee"`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" DROP CONSTRAINT "FK_705c9406163927351c6c7444623"`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" DROP CONSTRAINT "FK_da4617c781efe652a6f96475335"`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" DROP CONSTRAINT "FK_63ac916757350d28f05c5a6a4ba"`
    );
    await queryRunner.query(
      `ALTER TABLE "hostless_version" DROP CONSTRAINT "FK_5ae1edd7542ed7d451a8c5a6f7d"`
    );
    await queryRunner.query(
      `ALTER TABLE "hostless_version" DROP CONSTRAINT "FK_a206982827bcb64d78ec9fe62fd"`
    );
    await queryRunner.query(
      `ALTER TABLE "hostless_version" DROP CONSTRAINT "FK_88c9ffa29054e187b57629a0ea1"`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_user" DROP CONSTRAINT "FK_c0c0d4527c85db43fce8740df63"`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_user" DROP CONSTRAINT "FK_e571a1ae8dea508827ebb683b6e"`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_user" DROP CONSTRAINT "FK_409eafd87a95a20c960930a672f"`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_user" DROP CONSTRAINT "FK_d818a0220c38643263123942d48"`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_auth_config" DROP CONSTRAINT "FK_bcae49884012aa70b2bd3a0a298"`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_auth_config" DROP CONSTRAINT "FK_1801e7adff3a6efe07ff5ceeb09"`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_auth_config" DROP CONSTRAINT "FK_8d631d3bfa3cb9e519c004eaabc"`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_auth_config" DROP CONSTRAINT "FK_8209bba1bd3cae3ced862dd8325"`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_api_token" DROP CONSTRAINT "FK_7468d86fef98c8c0c6cab773a10"`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_api_token" DROP CONSTRAINT "FK_7693a4d6d4f31597dac57459ef6"`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_api_token" DROP CONSTRAINT "FK_a0d8d2672c1b8ca2c0b9af43701"`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_api_token" DROP CONSTRAINT "FK_11dc1c43bf75c683f58838b4ca6"`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_row_revision" DROP CONSTRAINT "FK_ca5510c0795729d138a94636684"`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_row_revision" DROP CONSTRAINT "FK_b89832647db0106fb22e3c98036"`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_row_revision" DROP CONSTRAINT "FK_87a3608950defe945c96c148ec1"`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_row_revision" DROP CONSTRAINT "FK_3648c20c31980d1e3c955223c82"`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_row" DROP CONSTRAINT "FK_5532a342e2b74f2c1c441315f41"`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_row" DROP CONSTRAINT "FK_1b2b8de8dd0ea03f66f7a63601e"`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_row" DROP CONSTRAINT "FK_617c0a8c7437e6fb3e4786b46c9"`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_row" DROP CONSTRAINT "FK_d998737aa12474845b3f4a3d4d4"`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_table" DROP CONSTRAINT "FK_8b972b2ee2be09519e2715b4b63"`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_table" DROP CONSTRAINT "FK_2d478647682d770af3c0ce18722"`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_table" DROP CONSTRAINT "FK_a10ce90bffe11fb003de35b5cf4"`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_table" DROP CONSTRAINT "FK_65bd7269acff00b52730e6524de"`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_database" DROP CONSTRAINT "FK_0c206d940e5b8f08cd7dd85d31e"`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_database" DROP CONSTRAINT "FK_9a5587fd4bb4d1d79594ea83742"`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_database" DROP CONSTRAINT "FK_57f98b7d56ab273dbbf7c82f782"`
    );
    await queryRunner.query(
      `ALTER TABLE "cms_database" DROP CONSTRAINT "FK_40d84f2bea82711c3f175d60308"`
    );
    await queryRunner.query(
      `ALTER TABLE "copilot_interaction" DROP CONSTRAINT "FK_610fad45a27578b833f9cd8f9ed"`
    );
    await queryRunner.query(
      `ALTER TABLE "copilot_interaction" DROP CONSTRAINT "FK_caaded0ae4265a9adc177762f0c"`
    );
    await queryRunner.query(
      `ALTER TABLE "copilot_interaction" DROP CONSTRAINT "FK_f8c7fecc5597a0df35df52dfe12"`
    );
    await queryRunner.query(
      `ALTER TABLE "copilot_interaction" DROP CONSTRAINT "FK_a32020acce73939756053d0ca1d"`
    );
    await queryRunner.query(
      `ALTER TABLE "copilot_usage" DROP CONSTRAINT "FK_b6613a1c30054b9ec9c13c66722"`
    );
    await queryRunner.query(
      `ALTER TABLE "copilot_usage" DROP CONSTRAINT "FK_11fa0d060b656fb81ca227554b8"`
    );
    await queryRunner.query(
      `ALTER TABLE "copilot_usage" DROP CONSTRAINT "FK_c989c7f8a2a79c73eb5b267ea9a"`
    );
    await queryRunner.query(
      `ALTER TABLE "generic_pair" DROP CONSTRAINT "FK_3756055706697b790335e7dfb97"`
    );
    await queryRunner.query(
      `ALTER TABLE "generic_pair" DROP CONSTRAINT "FK_e592a59ec74d13537ebbd2e2aba"`
    );
    await queryRunner.query(
      `ALTER TABLE "generic_pair" DROP CONSTRAINT "FK_2167285ba3e03b501c2acd189e7"`
    );
    await queryRunner.query(
      `ALTER TABLE "generic_key_value" DROP CONSTRAINT "FK_f1e03147ee95d7b1da4c45b9749"`
    );
    await queryRunner.query(
      `ALTER TABLE "generic_key_value" DROP CONSTRAINT "FK_5dac0c4d2e8f833a607305c9576"`
    );
    await queryRunner.query(
      `ALTER TABLE "generic_key_value" DROP CONSTRAINT "FK_a01e38e0e764c67ec7b71936c31"`
    );
    await queryRunner.query(
      `ALTER TABLE "sso_config" DROP CONSTRAINT "FK_a093781d5d4a8c8e47d94ad03ab"`
    );
    await queryRunner.query(
      `ALTER TABLE "sso_config" DROP CONSTRAINT "FK_667af3b44850e5168556b456a83"`
    );
    await queryRunner.query(
      `ALTER TABLE "sso_config" DROP CONSTRAINT "FK_eb76070d2678e976220f7785793"`
    );
    await queryRunner.query(
      `ALTER TABLE "sso_config" DROP CONSTRAINT "FK_82550c9a10e13404f28fd3d6f9f"`
    );
    await queryRunner.query(
      `ALTER TABLE "saml_config" DROP CONSTRAINT "FK_cb722b89d8a37ae2c5c7770f7b2"`
    );
    await queryRunner.query(
      `ALTER TABLE "saml_config" DROP CONSTRAINT "FK_761d4ae832a171678ad7d754e40"`
    );
    await queryRunner.query(
      `ALTER TABLE "saml_config" DROP CONSTRAINT "FK_f0e88885500b000f9cad1286d8a"`
    );
    await queryRunner.query(
      `ALTER TABLE "saml_config" DROP CONSTRAINT "FK_d2f8c610db8c9f536dd034258a5"`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source_operation" DROP CONSTRAINT "FK_44c5db509085b134bac04511ede"`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source_operation" DROP CONSTRAINT "FK_9e674090b18da8a093e9a1b8e30"`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source_operation" DROP CONSTRAINT "FK_cc00c2a9a382986369205ebc8c7"`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source_operation" DROP CONSTRAINT "FK_5174dcd70c1bfae3a7419e0c3b1"`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source" DROP CONSTRAINT "FK_681a540b285006616d46b0b136c"`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source" DROP CONSTRAINT "FK_cf526f27b3712a6620d62eacbb0"`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source" DROP CONSTRAINT "FK_f4f8c50f70dea5864a7da5a4aa9"`
    );
    await queryRunner.query(
      `ALTER TABLE "data_source" DROP CONSTRAINT "FK_69b41df48f2eb22f03b381a38ad"`
    );
    await queryRunner.query(
      `ALTER TABLE "feature_tier" DROP CONSTRAINT "FK_0dd4461f44b4bd23601544aa215"`
    );
    await queryRunner.query(
      `ALTER TABLE "feature_tier" DROP CONSTRAINT "FK_e19a7cca8167d58af185a113fe7"`
    );
    await queryRunner.query(
      `ALTER TABLE "feature_tier" DROP CONSTRAINT "FK_6c5adb026733d00e41db2f96ae6"`
    );
    await queryRunner.query(
      `ALTER TABLE "bundle_backup" DROP CONSTRAINT "FK_0f87a35be3e33ae4b0cda6bed7b"`
    );
    await queryRunner.query(
      `ALTER TABLE "bundle_backup" DROP CONSTRAINT "FK_8268076a91662f36de6552e840c"`
    );
    await queryRunner.query(
      `ALTER TABLE "bundle_backup" DROP CONSTRAINT "FK_dff6fc6483b76130e934a1f6671"`
    );
    await queryRunner.query(
      `ALTER TABLE "bundle_backup" DROP CONSTRAINT "FK_7d3d591fc555afe4f3ed32b6c03"`
    );
    await queryRunner.query(
      `ALTER TABLE "bundle_backup" DROP CONSTRAINT "FK_29342139cea1d6c0423c93a251d"`
    );
    await queryRunner.query(
      `ALTER TABLE "bundle_backup" DROP CONSTRAINT "FK_6f3d6d693181063ad726139cdc3"`
    );
    await queryRunner.query(
      `ALTER TABLE "dev_flag_overrides" DROP CONSTRAINT "FK_11de50d63ac7c022ee55386487d"`
    );
    await queryRunner.query(
      `ALTER TABLE "dev_flag_overrides" DROP CONSTRAINT "FK_91c7314334a58cf82e25d07c47e"`
    );
    await queryRunner.query(
      `ALTER TABLE "dev_flag_overrides" DROP CONSTRAINT "FK_c7aa72cbaf1c432335d719f2a97"`
    );
    await queryRunner.query(
      `ALTER TABLE "project_sync_metadata" DROP CONSTRAINT "FK_b65d7504b2da8cc1992c30976bb"`
    );
    await queryRunner.query(
      `ALTER TABLE "project_sync_metadata" DROP CONSTRAINT "FK_a4e52c142adc1150710c67832f2"`
    );
    await queryRunner.query(
      `ALTER TABLE "project_sync_metadata" DROP CONSTRAINT "FK_da4be5efb83ba354f5ae27ed2f9"`
    );
    await queryRunner.query(
      `ALTER TABLE "sign_up_attempt" DROP CONSTRAINT "FK_0e632bed7ce49f4056e8f6076d3"`
    );
    await queryRunner.query(
      `ALTER TABLE "sign_up_attempt" DROP CONSTRAINT "FK_5a66f723f0b48af4acffa7e4849"`
    );
    await queryRunner.query(
      `ALTER TABLE "sign_up_attempt" DROP CONSTRAINT "FK_a41e89e9a3bce6651ba52e9221a"`
    );
    await queryRunner.query(
      `ALTER TABLE "permission" DROP CONSTRAINT "FK_c60570051d297d8269fcdd9bc47"`
    );
    await queryRunner.query(
      `ALTER TABLE "permission" DROP CONSTRAINT "FK_4ff15ccf9e648f5255bd9f71a01"`
    );
    await queryRunner.query(
      `ALTER TABLE "permission" DROP CONSTRAINT "FK_8926eed7579b5d49cf31a1dc5cf"`
    );
    await queryRunner.query(
      `ALTER TABLE "permission" DROP CONSTRAINT "FK_6a1548bdf4d27c9df5a8442bfc2"`
    );
    await queryRunner.query(
      `ALTER TABLE "permission" DROP CONSTRAINT "FK_4d0a24c8995ff4940a38208d23a"`
    );
    await queryRunner.query(
      `ALTER TABLE "permission" DROP CONSTRAINT "FK_40c4877af6e402a449d56af4d39"`
    );
    await queryRunner.query(
      `ALTER TABLE "permission" DROP CONSTRAINT "FK_00e2c09abd157b5358faf3f43d0"`
    );
    await queryRunner.query(
      `ALTER TABLE "temporary_team_api_token" DROP CONSTRAINT "FK_aa82ebb6134471696705a680b15"`
    );
    await queryRunner.query(
      `ALTER TABLE "temporary_team_api_token" DROP CONSTRAINT "FK_7567190e1a841e15b82ff356f6b"`
    );
    await queryRunner.query(
      `ALTER TABLE "temporary_team_api_token" DROP CONSTRAINT "FK_696eae25247b767b1fe183f5065"`
    );
    await queryRunner.query(
      `ALTER TABLE "temporary_team_api_token" DROP CONSTRAINT "FK_222f5e01e041aef144ae4f3aa33"`
    );
    await queryRunner.query(
      `ALTER TABLE "team_api_token" DROP CONSTRAINT "FK_6ffc24586b63fdad873ec49f752"`
    );
    await queryRunner.query(
      `ALTER TABLE "team_api_token" DROP CONSTRAINT "FK_06e9219ffad5e2debf601f375ef"`
    );
    await queryRunner.query(
      `ALTER TABLE "team_api_token" DROP CONSTRAINT "FK_3184c97d06113ff79a349c628bc"`
    );
    await queryRunner.query(
      `ALTER TABLE "team_api_token" DROP CONSTRAINT "FK_2abcfa006f37f6dc0ff0980e9b8"`
    );
    await queryRunner.query(
      `ALTER TABLE "personal_api_token" DROP CONSTRAINT "FK_8233506f3285ba3bf0a8d689667"`
    );
    await queryRunner.query(
      `ALTER TABLE "personal_api_token" DROP CONSTRAINT "FK_150bf9c9c6e997563094e25da01"`
    );
    await queryRunner.query(
      `ALTER TABLE "personal_api_token" DROP CONSTRAINT "FK_0bfed0df56da9260eb1fb0cd85c"`
    );
    await queryRunner.query(
      `ALTER TABLE "personal_api_token" DROP CONSTRAINT "FK_560b77fc7c248491f1c188c2208"`
    );
    await queryRunner.query(
      `ALTER TABLE "userless_oauth_token" DROP CONSTRAINT "FK_3fc754d25a443657e5a6c628fa4"`
    );
    await queryRunner.query(
      `ALTER TABLE "userless_oauth_token" DROP CONSTRAINT "FK_5488ba47ed200338434a0c67dfe"`
    );
    await queryRunner.query(
      `ALTER TABLE "userless_oauth_token" DROP CONSTRAINT "FK_112a3d9d1c9c3cafeff16611cc4"`
    );
    await queryRunner.query(
      `ALTER TABLE "userless_oauth_token" DROP CONSTRAINT "FK_1087c8203cfea09f4f2072dee01"`
    );
    await queryRunner.query(
      `ALTER TABLE "oauth_token" DROP CONSTRAINT "FK_f6b4b1ac66b753feab5d831ba04"`
    );
    await queryRunner.query(
      `ALTER TABLE "oauth_token" DROP CONSTRAINT "FK_361f8e7c5a47e3abd54fce16c92"`
    );
    await queryRunner.query(
      `ALTER TABLE "oauth_token" DROP CONSTRAINT "FK_b70b79b392642aadbb50655e251"`
    );
    await queryRunner.query(
      `ALTER TABLE "oauth_token" DROP CONSTRAINT "FK_ad6de2e0626b79e0e2d18a6a4ae"`
    );
    await queryRunner.query(
      `ALTER TABLE "oauth_token" DROP CONSTRAINT "FK_5ec4a3bf35cce33c021cb5b0961"`
    );
    await queryRunner.query(
      `ALTER TABLE "loader_publishment" DROP CONSTRAINT "FK_94a28033134342f724549d16718"`
    );
    await queryRunner.query(
      `ALTER TABLE "loader_publishment" DROP CONSTRAINT "FK_721967bfbba778c4f1e18849af9"`
    );
    await queryRunner.query(
      `ALTER TABLE "loader_publishment" DROP CONSTRAINT "FK_01c86898d15d02e40096db99882"`
    );
    await queryRunner.query(
      `ALTER TABLE "pkg_version" DROP CONSTRAINT "FK_798b567fd1e6eb52c0d34a7d649"`
    );
    await queryRunner.query(
      `ALTER TABLE "pkg_version" DROP CONSTRAINT "FK_fdd9c21c7215c136cc92c0f5502"`
    );
    await queryRunner.query(
      `ALTER TABLE "pkg_version" DROP CONSTRAINT "FK_f4d28e5dc13e32fc1cc07b0acb3"`
    );
    await queryRunner.query(
      `ALTER TABLE "pkg_version" DROP CONSTRAINT "FK_e4bdfb459e976fb3c3819eae2c7"`
    );
    await queryRunner.query(
      `ALTER TABLE "pkg_version" DROP CONSTRAINT "FK_d007600fcb8eecbaa6ee0a25335"`
    );
    await queryRunner.query(
      `ALTER TABLE "pkg" DROP CONSTRAINT "FK_bab2ace4fd065dc129e8fb1c5df"`
    );
    await queryRunner.query(
      `ALTER TABLE "pkg" DROP CONSTRAINT "FK_f59b7c473a230a12996e1373200"`
    );
    await queryRunner.query(
      `ALTER TABLE "pkg" DROP CONSTRAINT "FK_3c843725df3c090ecad28aaf97c"`
    );
    await queryRunner.query(
      `ALTER TABLE "pkg" DROP CONSTRAINT "FK_e07e42beb28ffcfc0025fec594a"`
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification" DROP CONSTRAINT "FK_003b1154143246f0b3e91772c7c"`
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification" DROP CONSTRAINT "FK_cd9ad363c7165bb7b5878d78f14"`
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification" DROP CONSTRAINT "FK_7b75696721e15c7fa5dff57e281"`
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification" DROP CONSTRAINT "FK_0633c7742e1a51d943b9026aab0"`
    );
    await queryRunner.query(
      `ALTER TABLE "reset_password" DROP CONSTRAINT "FK_adc68d3bbd882b60fb367318ba5"`
    );
    await queryRunner.query(
      `ALTER TABLE "reset_password" DROP CONSTRAINT "FK_f43a10d675fb90a27bc76d42dad"`
    );
    await queryRunner.query(
      `ALTER TABLE "reset_password" DROP CONSTRAINT "FK_0204adaf85867cd81a99441bf29"`
    );
    await queryRunner.query(
      `ALTER TABLE "reset_password" DROP CONSTRAINT "FK_ff283fb3236e001571373ff9dc4"`
    );
    await queryRunner.query(
      `ALTER TABLE "trusted_host" DROP CONSTRAINT "FK_7e3fbe58d720196e079865cb1fd"`
    );
    await queryRunner.query(
      `ALTER TABLE "trusted_host" DROP CONSTRAINT "FK_47fca9f788fedafd943d1e44cea"`
    );
    await queryRunner.query(
      `ALTER TABLE "trusted_host" DROP CONSTRAINT "FK_09f691b912e9016d65d0933e055"`
    );
    await queryRunner.query(
      `ALTER TABLE "trusted_host" DROP CONSTRAINT "FK_a172c668e113fcbf54f1811eb32"`
    );
    await queryRunner.query(
      `ALTER TABLE "project_repository" DROP CONSTRAINT "FK_78457684e4bbb0211c95c147d25"`
    );
    await queryRunner.query(
      `ALTER TABLE "project_repository" DROP CONSTRAINT "FK_a7fe8e7574e92150277e996737e"`
    );
    await queryRunner.query(
      `ALTER TABLE "project_repository" DROP CONSTRAINT "FK_f90112c8e53eaba7f6c6829bed4"`
    );
    await queryRunner.query(
      `ALTER TABLE "project_repository" DROP CONSTRAINT "FK_2afe03975927067337ce4fd1754"`
    );
    await queryRunner.query(
      `ALTER TABLE "project_repository" DROP CONSTRAINT "FK_4dd24e277daeb279bbe6adcee69"`
    );
    await queryRunner.query(
      `ALTER TABLE "project_webhook_event" DROP CONSTRAINT "FK_17bbaf10d39d2a52d246581efe8"`
    );
    await queryRunner.query(
      `ALTER TABLE "project_webhook_event" DROP CONSTRAINT "FK_4e251ce9f5aa4d823bd96e829a0"`
    );
    await queryRunner.query(
      `ALTER TABLE "project_webhook_event" DROP CONSTRAINT "FK_7766b3265a3c3e12b767335fd50"`
    );
    await queryRunner.query(
      `ALTER TABLE "project_webhook_event" DROP CONSTRAINT "FK_647d827d9da2ce0052d5c46be30"`
    );
    await queryRunner.query(
      `ALTER TABLE "project_webhook" DROP CONSTRAINT "FK_67e1210506c4bb32386218d6be8"`
    );
    await queryRunner.query(
      `ALTER TABLE "project_webhook" DROP CONSTRAINT "FK_6a6894b1f884d4c8dcb442412a2"`
    );
    await queryRunner.query(
      `ALTER TABLE "project_webhook" DROP CONSTRAINT "FK_5830ead909b6b58127624aebbc0"`
    );
    await queryRunner.query(
      `ALTER TABLE "project_webhook" DROP CONSTRAINT "FK_fd0af95fe9a57ebdab21f317f0e"`
    );
    await queryRunner.query(
      `ALTER TABLE "partial_revision_cache" DROP CONSTRAINT "FK_e3f33013cdae4bc000669196006"`
    );
    await queryRunner.query(
      `ALTER TABLE "partial_revision_cache" DROP CONSTRAINT "FK_09c0931e1da426a2178dee5787d"`
    );
    await queryRunner.query(
      `ALTER TABLE "partial_revision_cache" DROP CONSTRAINT "FK_b9b4e6b855edec7b6675ded5b73"`
    );
    await queryRunner.query(
      `ALTER TABLE "partial_revision_cache" DROP CONSTRAINT "FK_545de270d6edb75e79e8f0d2545"`
    );
    await queryRunner.query(
      `ALTER TABLE "partial_revision_cache" DROP CONSTRAINT "FK_8fbe10648c6e0627bfc75d80f87"`
    );
    await queryRunner.query(
      `ALTER TABLE "partial_revision_cache" DROP CONSTRAINT "FK_3f0b1eb073f9f4cefb803fb88cb"`
    );
    await queryRunner.query(
      `ALTER TABLE "project_revision" DROP CONSTRAINT "FK_da417c69cd6944f548fda45c272"`
    );
    await queryRunner.query(
      `ALTER TABLE "project_revision" DROP CONSTRAINT "FK_52a9e1ddd348950d99766c0d07d"`
    );
    await queryRunner.query(
      `ALTER TABLE "project_revision" DROP CONSTRAINT "FK_ee90236e6c310b450b30f903b91"`
    );
    await queryRunner.query(
      `ALTER TABLE "project_revision" DROP CONSTRAINT "FK_19f7c0cafeae58b54c0ac2c805c"`
    );
    await queryRunner.query(
      `ALTER TABLE "project_revision" DROP CONSTRAINT "FK_9afb13e88a406695429ae3feb44"`
    );
    await queryRunner.query(
      `ALTER TABLE "branch" DROP CONSTRAINT "FK_1f4dabba86c5e82bc777d2e2c43"`
    );
    await queryRunner.query(
      `ALTER TABLE "branch" DROP CONSTRAINT "FK_2570acf6325f1713958ef845e2c"`
    );
    await queryRunner.query(
      `ALTER TABLE "branch" DROP CONSTRAINT "FK_543fa3f5ab7f0d5d85671f10907"`
    );
    await queryRunner.query(
      `ALTER TABLE "branch" DROP CONSTRAINT "FK_c3254ff11158f942a808f3ba344"`
    );
    await queryRunner.query(
      `ALTER TABLE "branch" DROP CONSTRAINT "FK_c8b6e72ddfdd41e7ff256b21658"`
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP CONSTRAINT "FK_c224ab17df530651e53a398ed92"`
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP CONSTRAINT "FK_fe67adbc435f2864cf458df7c33"`
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP CONSTRAINT "FK_69b474c75777a1f7ac5551e8e26"`
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP CONSTRAINT "FK_dfdad0cd83b31ccb2204f3dc688"`
    );
    await queryRunner.query(
      `ALTER TABLE "project" DROP CONSTRAINT "FK_678acfe7017fe8a25fe7cae5f18"`
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_f25c1f94bb527428b237363a9ef"`
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_4f5adb58513c2fe57eb9c79cc16"`
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_c3062c4102a912dfe7195a72bfb"`
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_db5173f7d27aa8a98a9fe6113df"`
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP CONSTRAINT "FK_45c0d39d1f9ceeb56942db93cc5"`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace" DROP CONSTRAINT "FK_4d1eceef7e5f8e70fe3ead745d9"`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace" DROP CONSTRAINT "FK_4961cf337b086f3bcbc68d54562"`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace" DROP CONSTRAINT "FK_7a88c01f91d572187ff58ee4bcd"`
    );
    await queryRunner.query(
      `ALTER TABLE "workspace" DROP CONSTRAINT "FK_fb730da36fb79e21e8fa5f2c303"`
    );
    await queryRunner.query(
      `ALTER TABLE "team" DROP CONSTRAINT "FK_bb0c8fe5c1b1a2087b4420ae3fa"`
    );
    await queryRunner.query(
      `ALTER TABLE "team" DROP CONSTRAINT "FK_bd8c00e60bbc2aa52dfebef3251"`
    );
    await queryRunner.query(
      `ALTER TABLE "team" DROP CONSTRAINT "FK_250950015142683e6bea5c07018"`
    );
    await queryRunner.query(
      `ALTER TABLE "team" DROP CONSTRAINT "FK_a740aada0e5c9ed5b6344897706"`
    );
    await queryRunner.query(
      `ALTER TABLE "team" DROP CONSTRAINT "FK_3152d46f0ce8751aca92399783d"`
    );
    await queryRunner.query(
      `ALTER TABLE "team" DROP CONSTRAINT "FK_3a93fbdeba4e1e9e47fec6bada9"`
    );
    await queryRunner.query(
      `ALTER TABLE "org" DROP CONSTRAINT "FK_521d29ec4880242946002ab9cc9"`
    );
    await queryRunner.query(
      `ALTER TABLE "org" DROP CONSTRAINT "FK_8e182d7c15e48c39ff89a7595f8"`
    );
    await queryRunner.query(
      `ALTER TABLE "org" DROP CONSTRAINT "FK_4223d3778857d70a5a56bf695c7"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3af75f9ec3a39b90d0f0749813"`
    );
    await queryRunner.query(`DROP TABLE "plasmic_hosting_settings"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1ca9bf19fed3baf06eef08c585"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9d503608fe71b9c526b0a0dd5a"`
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
    await queryRunner.query(
      `DROP INDEX "public"."IDX_039283d243fc2a877052b1523c"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d5195662fd6274a8350d561c56"`
    );
    await queryRunner.query(`DROP TABLE "data_source_allowed_projects"`);
    await queryRunner.query(`DROP TABLE "promotion_code"`);
    await queryRunner.query(`DROP TABLE "tutorial_db"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_788cf7fdc2be27aebfa0508a98"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_71147186f2f14113fa0c789ad7"`
    );
    await queryRunner.query(`DROP TABLE "app_access_registry"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_60f728bb5bb635e9c971b0641d"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_771ec5427dfbe9d6e4f41798e4"`
    );
    await queryRunner.query(`DROP TABLE "app_end_user_group"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_04b492ac3632bedb8ab5e6cd40"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ab69768c857fae791f200d8f4c"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a8fbefd202b486f99d30b933df"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8bc08861aa1ff42a2d6afd8e2c"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_249b809ab5161656981b1ee0b6"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e539a99d0191131ec41ac092b5"`
    );
    await queryRunner.query(`DROP TABLE "app_end_user_access"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e9fe54c0ebf13c3c0db71d1e2d"`
    );
    await queryRunner.query(`DROP TABLE "issued_code"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2b8b28efea573ca75fc0208876"`
    );
    await queryRunner.query(`DROP TABLE "app_role"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7afa6ec828f0e23580f7ccbf97"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a058972da8bf44ce5dc1dcd25f"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1c5c84b27655c28bbd23352437"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ab88a34b5ace106f2258708691"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8aa0806140c1ecb89796ad865e"`
    );
    await queryRunner.query(`DROP TABLE "app_auth_config"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2a795b27f84082d8a7d2d3583f"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_afd59a807a5bdd663ff4b53a14"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ea98d74e1c1fbd0c34c3769f52"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_df0fc89c523bbc473ae3afdc0d"`
    );
    await queryRunner.query(`DROP TABLE "end_user"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f4f947970d01395600ef96a6ad"`
    );
    await queryRunner.query(`DROP TABLE "directory_end_user_group"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_be3e38a27721d428db95018b09"`
    );
    await queryRunner.query(`DROP TABLE "end_user_directory"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_88bb607240417f03c0592da682"`
    );
    await queryRunner.query(`DROP TABLE "comment_reaction"`);
    await queryRunner.query(`DROP INDEX "public"."PROJECT_AND_BRANCH_IDX"`);
    await queryRunner.query(`DROP TABLE "comment"`);
    await queryRunner.query(`DROP TABLE "hostless_version"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3a4bcc1c5c3b3d91ea61f1a150"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_79bd381227f69aac86c8ef416e"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ee0d54b3d049b16a596d0be61d"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c0c0d4527c85db43fce8740df6"`
    );
    await queryRunner.query(`DROP TABLE "workspace_user"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bcae49884012aa70b2bd3a0a29"`
    );
    await queryRunner.query(`DROP TABLE "workspace_auth_config"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7468d86fef98c8c0c6cab773a1"`
    );
    await queryRunner.query(`DROP TABLE "workspace_api_token"`);
    await queryRunner.query(`DROP TABLE "cms_row_revision"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5532a342e2b74f2c1c441315f4"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_055a0d004271a6044e9685a114"`
    );
    await queryRunner.query(`DROP TABLE "cms_row"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8b972b2ee2be09519e2715b4b6"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f3a4276992d60a7971cbdc215c"`
    );
    await queryRunner.query(`DROP TABLE "cms_table"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0c206d940e5b8f08cd7dd85d31"`
    );
    await queryRunner.query(`DROP TABLE "cms_database"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a32020acce73939756053d0ca1"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_610fad45a27578b833f9cd8f9e"`
    );
    await queryRunner.query(`DROP TABLE "copilot_interaction"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_71de3eb73b78306b45ddf14ca1"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c989c7f8a2a79c73eb5b267ea9"`
    );
    await queryRunner.query(`DROP TABLE "copilot_usage"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7a9713347efa162c414562d195"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_75b1a80bd153b429c4b2a5611d"`
    );
    await queryRunner.query(`DROP TABLE "generic_pair"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6b16cfbbab5d24092507d13820"`
    );
    await queryRunner.query(`DROP TABLE "generic_key_value"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_42ac9294c4fad3c1cce491286e"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ef6cc05f69224a3e57db568272"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a093781d5d4a8c8e47d94ad03a"`
    );
    await queryRunner.query(`DROP TABLE "sso_config"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2c339c724a5ff9c6811011a76a"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_005c00c000020743507c64c643"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cb722b89d8a37ae2c5c7770f7b"`
    );
    await queryRunner.query(`DROP TABLE "saml_config"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_44c5db509085b134bac04511ed"`
    );
    await queryRunner.query(`DROP TABLE "data_source_operation"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_681a540b285006616d46b0b136"`
    );
    await queryRunner.query(`DROP TABLE "data_source"`);
    await queryRunner.query(`DROP TABLE "feature_tier"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8268076a91662f36de6552e840"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b86367f314717b31a5a8a257f6"`
    );
    await queryRunner.query(`DROP TABLE "bundle_backup"`);
    await queryRunner.query(`DROP TABLE "dev_flag_overrides"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fcbcd401fc78cbbd1d59c75a3d"`
    );
    await queryRunner.query(`DROP TABLE "project_sync_metadata"`);
    await queryRunner.query(`DROP TABLE "sign_up_attempt"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5fa0994c9a11e5d8c8abbb1855"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c60570051d297d8269fcdd9bc4"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4ff15ccf9e648f5255bd9f71a0"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8926eed7579b5d49cf31a1dc5c"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6a1548bdf4d27c9df5a8442bfc"`
    );
    await queryRunner.query(`DROP TABLE "permission"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2d2e88da1f72501bb949764f3f"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_aa82ebb6134471696705a680b1"`
    );
    await queryRunner.query(`DROP TABLE "temporary_team_api_token"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d063520eea36f3f39955aceb2e"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6ffc24586b63fdad873ec49f75"`
    );
    await queryRunner.query(`DROP TABLE "team_api_token"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bc3c96ea4e6a272c9ce5d685fd"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8233506f3285ba3bf0a8d68966"`
    );
    await queryRunner.query(`DROP TABLE "personal_api_token"`);
    await queryRunner.query(`DROP TABLE "userless_oauth_token"`);
    await queryRunner.query(`DROP TABLE "oauth_token"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f2b1e2523765b216ea5b83fee4"`
    );
    await queryRunner.query(`DROP TABLE "loader_publishment"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_42d8ba30ffa7c1f3b65d21a9f7"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c57e578dfa2b25690f98e0e867"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_54a198af92cb0ef5e9747a4782"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_eccdba1b0e2ec9663f3f783f0d"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fdd9c21c7215c136cc92c0f550"`
    );
    await queryRunner.query(`DROP TABLE "pkg_version"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bab2ace4fd065dc129e8fb1c5d"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_89277ee9bdc41aa5de5028221d"`
    );
    await queryRunner.query(`DROP TABLE "pkg"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_003b1154143246f0b3e91772c7"`
    );
    await queryRunner.query(`DROP TABLE "email_verification"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_adc68d3bbd882b60fb367318ba"`
    );
    await queryRunner.query(`DROP TABLE "reset_password"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7e3fbe58d720196e079865cb1f"`
    );
    await queryRunner.query(`DROP TABLE "trusted_host"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_78457684e4bbb0211c95c147d2"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a7fe8e7574e92150277e996737"`
    );
    await queryRunner.query(`DROP TABLE "project_repository"`);
    await queryRunner.query(`DROP TABLE "project_webhook_event"`);
    await queryRunner.query(`DROP TABLE "project_webhook"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4c902c70a3fba5024b4f7501e8"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_571dafe7d600c38346797415c4"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e3f33013cdae4bc00066919600"`
    );
    await queryRunner.query(`DROP TABLE "partial_revision_cache"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e633c2a71b2587dc1c1db44b43"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c0118354bf74579507a0bb3d69"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a6c699a994fb0dc07fed6bed66"`
    );
    await queryRunner.query(`DROP TABLE "project_revision"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1f4dabba86c5e82bc777d2e2c4"`
    );
    await queryRunner.query(`DROP TABLE "branch"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c224ab17df530651e53a398ed9"`
    );
    await queryRunner.query(`DROP TABLE "project"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_43b86bfb43aa4310fcf84d1381"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_db634d6f46b18685dc209a69cf"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e12875dfb3b1d92d7d7c5377e2"`
    );
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4d1eceef7e5f8e70fe3ead745d"`
    );
    await queryRunner.query(`DROP TABLE "workspace"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_365fdc8b9d557274d6f3489a8b"`
    );
    await queryRunner.query(`DROP TABLE "team"`);
    await queryRunner.query(`DROP TABLE "org"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_294be58e675b784fa211b6a151"`
    );
    await queryRunner.query(`DROP TABLE "express_session"`);
  }
}
