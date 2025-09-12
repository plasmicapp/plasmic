import {
  arrayEqIgnoreOrder,
  mkShortId,
  remove,
  removeWhere,
  switchType,
} from "@/wab/shared/common";
import { cloneVariantedValue } from "@/wab/shared/core/styles";
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
  | MutableToken<T>
  | OverrideableToken<T>
  | ImmutableToken<T>;

export abstract class BaseToken<T extends Token> {
  constructor(readonly base: T, readonly isLocal: boolean) {}

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
    value: string
  ): void {
    tokenOrOverride.value = value;
    BaseToken.removeExtraneousValues(tokenOrOverride);
  }

  protected static setVariantedValue<T extends Token>(
    tokenOrOverride: T | StyleTokenOverride,
    variants: Variant[],
    value: string
  ): void {
    const variantedValue = tokenOrOverride.variantedValues.find((v) =>
      arrayEqIgnoreOrder(v.variants, variants)
    );
    if (variantedValue) {
      variantedValue.value = value;
    } else {
      tokenOrOverride.variantedValues.push(
        new VariantedValue({
          variants,
          value,
        })
      );
    }

    BaseToken.removeExtraneousValues(tokenOrOverride);
  }

  protected static removeExtraneousValues<T extends Token>(
    tokenOrOverride: T | StyleTokenOverride
  ): void {
    tokenOrOverride.variantedValues.forEach((v) => {
      if (v.value === tokenOrOverride.value) {
        remove(tokenOrOverride.variantedValues, v);
      }
    });
  }

  protected static removeVariantedValue<T extends Token>(
    tokenOrOverride: T | StyleTokenOverride,
    variants: Variant[]
  ): void {
    removeWhere(tokenOrOverride.variantedValues, (v) =>
      arrayEqIgnoreOrder(v.variants, variants)
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
  }

  setVariantedValue(variants: Variant[], value: string): void {
    BaseToken.setVariantedValue(this.base, variants, value);
  }

  removeVariantedValue(variants: Variant[]): void {
    BaseToken.removeVariantedValue(this.base, variants);
  }
}

/**Tokens from direct dependencies are immutable but can be overridden. */
// TODO: Make this work for Data Tokens
export class OverrideableToken<T extends Token> extends BaseToken<T> {
  constructor(base: T, private readonly site: Site) {
    super(base, false);
  }

  get override(): StyleTokenOverride | null {
    return (
      this.site.styleTokenOverrides.find(
        (t) => t.token.uuid === this.base.uuid
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
      // filter out overridden variants
      ...this.base.variantedValues.filter(
        (v) =>
          !override.variantedValues.find((ov) =>
            arrayEqIgnoreOrder(v.variants, ov.variants)
          )
      ),
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
        if (variantedValue.value === this.value) {
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
      (o) => o.token.uuid === this.base.uuid
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

export function toFinalToken(
  token: DataToken,
  site: Site
): FinalToken<DataToken>;
export function toFinalToken(
  token: StyleToken,
  site: Site
): FinalToken<StyleToken>;
export function toFinalToken(token: Token, site: Site) {
  const isLocal = isKnownStyleToken(token)
    ? site.styleTokens.includes(token)
    : site.dataTokens.includes(token);

  if (isLocal && token.isRegistered) {
    return new OverrideableToken(token, site);
  } else if (isLocal) {
    return new MutableToken(token);
  } else if (
    site.projectDependencies.some((dep) =>
      isKnownStyleToken(token)
        ? dep.site.styleTokens.includes(token)
        : dep.site.dataTokens.includes(token)
    )
  ) {
    return new OverrideableToken(token, site);
  } else {
    return new ImmutableToken(token, isLocal);
  }
}
