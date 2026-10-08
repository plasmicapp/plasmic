import {
  arrayEqIgnoreOrder,
  mkShortId,
  remove,
  removeWhere,
  switchType,
} from "@/wab/shared/common";
import { cloneVariantedValue } from "@/wab/shared/core/styles";
import { maybeComputedFn } from "@/wab/shared/mobx-util";
import {
  DataToken,
  Site,
  StyleToken,
  StyleTokenOverride,
  Token,
  Variant,
  VariantedValue,
  isKnownStyleToken,
} from "@/wab/shared/model/classes";

export type FinalToken<T extends Token> =
  MutableToken<T> | OverrideableToken<T> | ImmutableToken<T>;

export abstract class BaseToken<T extends Token> {
  constructor(
    readonly base: T,
    readonly isLocal: boolean,
  ) {}

  get override(): StyleTokenOverride | null {
    return null;
  }

  get uuid(): string {
    return this.base.uuid;
  }
  get name(): string {
    return this.base.name;
  }
  get type(): T["type"] {
    return this.base.type;
  }
  get isRegistered(): boolean {
    return this.base.isRegistered;
  }
  // TODO: use TokenValue
  get value(): string {
    return this.base.value;
  }
  // TODO: use TokenValue
  get variantedValues(): readonly VariantedValue[] {
    return this.base.variantedValues;
  }

  protected static setValue<T extends Token>(
    tokenOrOverride: T | StyleTokenOverride,
    value: string,
  ): void {
    tokenOrOverride.value = value;
  }

  protected static setVariantedValue<T extends Token>(
    tokenOrOverride: T | StyleTokenOverride,
    variants: Variant[],
    value: string,
  ): void {
    const variantedValue = tokenOrOverride.variantedValues.find((v) =>
      arrayEqIgnoreOrder(v.variants, variants),
    );
    if (variantedValue) {
      variantedValue.value = value;
    } else {
      tokenOrOverride.variantedValues.push(
        new VariantedValue({
          variants,
          value,
        }),
      );
    }
  }

  protected static removeVariantedValue<T extends Token>(
    tokenOrOverride: T | StyleTokenOverride,
    variants: Variant[],
  ): void {
    removeWhere(tokenOrOverride.variantedValues, (v) =>
      arrayEqIgnoreOrder(v.variants, variants),
    );
  }
}

/**Tokens in the local project are mutable. */
export class MutableToken<T extends Token> extends BaseToken<T> {
  constructor(base: T) {
    super(base, true);
  }

  setValue(value: string): void {
    BaseToken.setValue(this.base, value);
    this.removeExtraneousValues();
  }

  setVariantedValue(variants: Variant[], value: string): void {
    BaseToken.setVariantedValue(this.base, variants, value);
    this.removeExtraneousValues();
  }

  removeVariantedValue(variants: Variant[]): void {
    BaseToken.removeVariantedValue(this.base, variants);
  }

  private removeExtraneousValues(): void {
    this.variantedValues.forEach((v) => {
      if (v.value === this.base.value) {
        remove(this.base.variantedValues, v);
      }
    });
  }
}

/**Tokens from direct dependencies are immutable but can be overridden. */
// TODO: Make this work for Data Tokens
export class OverrideableToken<T extends Token> extends BaseToken<T> {
  constructor(
    base: T,
    private readonly site: Site,
  ) {
    super(base, false);
  }

  get override(): StyleTokenOverride | null {
    return (
      this.site.styleTokenOverrides.find(
        (t) => t.token.uuid === this.base.uuid,
      ) ?? null
    );
  }

  get value(): string {
    return this.override?.value ?? this.base.value;
  }
  get variantedValues(): readonly VariantedValue[] {
    const override = this.override;
    if (!override) {
      return this.base.variantedValues;
    }

    return [
      ...this.base.variantedValues,
      // add overridden variants
      ...override.variantedValues,
    ];
  }

  setValue(value: string) {
    const override = this.upsertStyleTokenOverride();
    BaseToken.setValue(override, value);
    this.removeExtraneousValues();
  }

  setVariantedValue(variants: Variant[], value: string) {
    const override = this.upsertStyleTokenOverride();
    BaseToken.setVariantedValue(override, variants, value);
    this.removeExtraneousValues();
  }

  /** Returns true if override no longer exists. */
  private removeExtraneousValues() {
    const override = this.override;
    if (override) {
      if (override.value === this.base.value) {
        this.removeValue();
      }
      override.variantedValues.forEach((variantedValue) => {
        const baseValue =
          // if the global variant for the varianted value is imported (e.g. imported breakpoints), use the imported varianted value as the base value
          this.base.variantedValues.find((v) =>
            arrayEqIgnoreOrder(v.variants, variantedValue.variants),
          )?.value ??
          // use the overrideable base value
          this.value;

        if (variantedValue.value === baseValue) {
          this.removeVariantedValue(variantedValue.variants);
        }
      });

      return this.removeOverrideIfEmpty();
    }
    return true;
  }

  /** Returns true if override no longer exists. */
  removeValue(): boolean {
    const override = this.override;
    if (!override) {
      return true;
    }

    override.value = null;
    return this.removeExtraneousValues();
  }

  /** Returns true if override no longer exists. */
  removeVariantedValue(variants: Variant[]): boolean {
    const override = this.override;
    if (!override) {
      return true;
    }

    BaseToken.removeVariantedValue(override, variants);
    return this.removeExtraneousValues();
  }

  private upsertStyleTokenOverride(): StyleTokenOverride {
    const existingOverride = this.site.styleTokenOverrides.find(
      (o) => o.token.uuid === this.base.uuid,
    );
    if (existingOverride) {
      return existingOverride;
    }
    const newOverride = new StyleTokenOverride({
      token: this.base as StyleToken,
      value: null,
      variantedValues: [],
    });
    this.site.styleTokenOverrides.push(newOverride);
    return newOverride;
  }

  /** Returns true if removed. */
  private removeOverrideIfEmpty(): boolean {
    const override = this.override;
    if (!override) {
      return false;
    }

    if (!override.value && override.variantedValues.length === 0) {
      remove(this.site.styleTokenOverrides, override);
      return true;
    } else {
      return false;
    }
  }
}

/**Tokens from transitive dependencies are immutable and cannot be overridden. */
export class ImmutableToken<T extends Token> extends BaseToken<T> {}

export function cloneToken(token: StyleToken): StyleToken;
export function cloneToken(token: DataToken): DataToken;
export function cloneToken(token: Token): Token {
  return switchType(token)
    .when(StyleToken, (t) => {
      return new StyleToken({
        name: t.name,
        type: t.type,
        value: t.value,
        variantedValues: t.variantedValues.map(cloneVariantedValue),
        uuid: mkShortId(),
        isRegistered: t.isRegistered,
        regKey: t.regKey,
      });
    })
    .when(DataToken, (t) => {
      return new DataToken({
        name: t.name,
        type: t.type,
        value: t.value,
        variantedValues: t.variantedValues.map(cloneVariantedValue),
        uuid: mkShortId(),
        isRegistered: t.isRegistered,
        regKey: t.regKey,
      });
    })
    .result();
}

// Observable sites invalidate these sets when token membership or dependencies change.
// Plain server sites rebuild them; batch callers reuse them only for one traversal.
const tokenMembership = maybeComputedFn(
  (site: Site, type: "styleTokens" | "dataTokens") => ({
    local: new Set<Token>(site[type]),
    direct: new Set<Token>(
      site.projectDependencies.flatMap((dep): Token[] => dep.site[type]),
    ),
  }),
);

/** A snapshot of token ownership for a single batch; do not retain across edits. */
export function mkToFinalToken(site: Site) {
  let styleMembership: ReturnType<typeof tokenMembership> | undefined;
  let dataMembership: ReturnType<typeof tokenMembership> | undefined;
  return <T extends Token>(token: T): FinalToken<T> => {
    const base: Token = token;
    const membership = isKnownStyleToken(base)
      ? (styleMembership ??= tokenMembership(site, "styleTokens"))
      : (dataMembership ??= tokenMembership(site, "dataTokens"));
    const isLocal = membership.local.has(token);
    if (isLocal && !token.isRegistered) {
      return new MutableToken(token);
    } else if (isLocal || membership.direct.has(token)) {
      return new OverrideableToken(token, site);
    } else {
      return new ImmutableToken(token, isLocal);
    }
  };
}

export function toFinalToken(
  token: DataToken,
  site: Site,
): FinalToken<DataToken>;
export function toFinalToken(
  token: StyleToken,
  site: Site,
): FinalToken<StyleToken>;
export function toFinalToken(token: Token, site: Site) {
  return mkToFinalToken(site)(token);
}
