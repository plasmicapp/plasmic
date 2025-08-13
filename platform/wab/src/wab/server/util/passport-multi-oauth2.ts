import { logger } from "@/wab/server/observability";
import type * as express from "express";
import { Profile } from "passport";
import { _StrategyOptionsBase } from "passport-google-oauth20";
import {
  StrategyOptions,
  StrategyOptionsWithRequest,
  VerifyFunction,
  VerifyFunctionWithRequest,
} from "passport-oauth2";
import OktaStrategy from "passport-okta-oauth20/dist/src/Strategy";
import { Strategy as AbstractStrategy } from "passport-strategy";

export type KnownProvider = "okta";

export type StrategyOptionsCallback = (
  err: Error | null,
  options: Partial<OAuth2Config> & { provider: KnownProvider }
) => void;

export type OAuth2Config = _StrategyOptionsBase;

export interface MultiOAuth2StrategyConfigBase {
  getOAuth2Options(
    req: express.Request,
    callback: StrategyOptionsCallback
  ): void;
}

export type MultiOAuth2StrategyConfigWithRequest =
  Partial<StrategyOptionsWithRequest> & MultiOAuth2StrategyConfigBase;

export type MultiOAuth2StrategyConfigWithoutRequest = Partial<StrategyOptions> &
  MultiOAuth2StrategyConfigBase;

export type MultiOAuth2StrategyConfig =
  | MultiOAuth2StrategyConfigWithRequest
  | MultiOAuth2StrategyConfigWithoutRequest;

export type VerifiedCallback = (
  err: Error | null,
  user?: Record<string, unknown>,
  info?: Record<string, unknown>
) => void;

export type VerifyWithRequest = (
  req: express.Request,
  profile: Profile | null,
  done: VerifiedCallback
) => void;

export type VerifyWithoutRequest = (
  profile: Profile | null,
  done: VerifiedCallback
) => void;

export class MultiOAuth2Strategy extends AbstractStrategy {
  constructor(
    opts: MultiOAuth2StrategyConfigWithRequest,
    verify: VerifyFunctionWithRequest
  );
  constructor(
    opts: MultiOAuth2StrategyConfigWithoutRequest,
    verify: VerifyFunction
  );
  constructor(private opts: MultiOAuth2StrategyConfig, private verify: any) {
    super();
  }

  authenticate(
    req: express.Request,
    options?: MultiOAuth2StrategyConfig
  ): void {
    this.opts.getOAuth2Options(req, (err, res) => {
      if (err) {
        logger().error("ERROR", err);
        throw err;
      }
      const fullOptions = {
        ...this.opts,
        ...options,
        ...res,
      } as StrategyOptions;
      const strategy = this.makeDelegatedStrategy(res.provider, fullOptions);
      strategy.authenticate(req);
    });
  }

  private makeDelegatedStrategy(provider: KnownProvider, options: any) {
    const make = () => {
      if (provider === "okta") {
        return new OktaStrategy(options, this.verify);
      } else {
        throw new Error(`Unknown provider ${provider}`);
      }
    };

    const strategy = make();
    strategy.success = this.success;
    strategy.fail = this.fail;
    strategy.redirect = this.redirect;
    strategy.pass = this.pass;
    strategy.error = this.error;
    return strategy;
  }
}
