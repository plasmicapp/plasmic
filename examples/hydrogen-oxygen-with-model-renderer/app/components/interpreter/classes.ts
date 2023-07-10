// @ts-ignore
// @ts-nocheck
/* ts-lint:disable */
import {meta} from './classes-metas';
import {assert, mkUnexpectedTypeMsg} from './common';
class Sentinel {
  tag: 'SENTINEL' = 'SENTINEL';
}
const sentinel = new Sentinel();
type KnownType =
  | KnownScalar
  | KnownImg
  | KnownAny
  | KnownChoice
  | KnownComponentInstance
  | KnownPlumeInstance
  | KnownUserType
  | KnownQueryData
  | KnownFunctionType
  | KnownArgType
  | KnownClassNamePropType
  | KnownStyleScopeClassNamePropType
  | KnownDefaultStylesClassNamePropType
  | KnownDefaultStylesPropType
  | KnownColorPropType;
export function isKnownType<T>(
  x: [Extract<T, Type>] extends [never] ? never : T,
): x is [Extract<T, Type>] extends [never]
  ? never
  : Type extends T // Needed when T is any
  ? Type
  : Extract<T, Type> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseType;
}

export function ensureKnownType<T>(
  x: [Extract<T, Type>] extends [never] ? never : T,
): Type {
  assert(isKnownType(x), () => mkUnexpectedTypeMsg([Type], x));
  return x;
}
export function ensureMaybeKnownType<T>(
  x: [Extract<T, Type>] extends [never] ? never : T,
): Type | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownType(x);
}

export type Type = KnownType;
export interface TypeParams {
  name: string /*  */;
}

abstract class BaseType {
  static isKnown(x: any): x is Type {
    return isKnownType(x);
  }
  static getType(): Type {
    throw new Error();
  }
  static modelTypeName = 'Type';

  constructor(args: TypeParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.Type(this, args);
    }
  }
  uid: number;
  name: string /*  */;
}

export const Type = BaseType;

type KnownScalar = KnownNum | KnownText | KnownBool;
export function isKnownScalar<T>(
  x: [Extract<T, Scalar>] extends [never] ? never : T,
): x is [Extract<T, Scalar>] extends [never]
  ? never
  : Scalar extends T // Needed when T is any
  ? Scalar
  : Extract<T, Scalar> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseScalar;
}

export function ensureKnownScalar<T>(
  x: [Extract<T, Scalar>] extends [never] ? never : T,
): Scalar {
  assert(isKnownScalar(x), () => mkUnexpectedTypeMsg([Scalar], x));
  return x;
}
export function ensureMaybeKnownScalar<T>(
  x: [Extract<T, Scalar>] extends [never] ? never : T,
): Scalar | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownScalar(x);
}

export type Scalar = KnownScalar;
export interface ScalarParams {
  name: string /*  */;
}

abstract class BaseScalar extends BaseType {
  static isKnown(x: any): x is Scalar {
    return isKnownScalar(x);
  }
  static getType(): Scalar {
    throw new Error();
  }
  static modelTypeName = 'Scalar';

  constructor(args: ScalarParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.Scalar(this, args);
    }
  }
  uid: number;
  name: string /*  */;
}

export const Scalar = BaseScalar;

type KnownNum = ClsNum;
export function isKnownNum<T>(
  x: [Extract<T, Num>] extends [never] ? never : T,
): x is [Extract<T, Num>] extends [never]
  ? never
  : Num extends T // Needed when T is any
  ? Num
  : Extract<T, Num> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseNum;
}
export function isExactlyNum(x: any): x is Num {
  return x?.['typeTag'] === 'Num';
}

export function ensureKnownNum<T>(
  x: [Extract<T, Num>] extends [never] ? never : T,
): Num {
  assert(isKnownNum(x), () => mkUnexpectedTypeMsg([Num], x));
  return x;
}
export function ensureMaybeKnownNum<T>(
  x: [Extract<T, Num>] extends [never] ? never : T,
): Num | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownNum(x);
}

export type Num = KnownNum;
export interface NumParams {
  name: string /*  */;
}

abstract class BaseNum extends BaseScalar {
  static isKnown(x: any): x is Num {
    return isKnownNum(x);
  }
  static getType(): Num {
    throw new Error();
  }
  static modelTypeName = 'Num';

  constructor(args: NumParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.Num(this, args);
    }
  }
  uid: number;
  name: string /*  */;
}
class ClsNum extends BaseNum {
  get typeTag(): 'Num' {
    return 'Num';
  }
}
export const Num = ClsNum;

type KnownText = ClsText;
export function isKnownText<T>(
  x: [Extract<T, Text>] extends [never] ? never : T,
): x is [Extract<T, Text>] extends [never]
  ? never
  : Text extends T // Needed when T is any
  ? Text
  : Extract<T, Text> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseText;
}
export function isExactlyText(x: any): x is Text {
  return x?.['typeTag'] === 'Text';
}

export function ensureKnownText<T>(
  x: [Extract<T, Text>] extends [never] ? never : T,
): Text {
  assert(isKnownText(x), () => mkUnexpectedTypeMsg([Text], x));
  return x;
}
export function ensureMaybeKnownText<T>(
  x: [Extract<T, Text>] extends [never] ? never : T,
): Text | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownText(x);
}

export type Text = KnownText;
export interface TextParams {
  name: string /*  */;
}

abstract class BaseText extends BaseScalar {
  static isKnown(x: any): x is Text {
    return isKnownText(x);
  }
  static getType(): Text {
    throw new Error();
  }
  static modelTypeName = 'Text';

  constructor(args: TextParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.Text(this, args);
    }
  }
  uid: number;
  name: string /*  */;
}
class ClsText extends BaseText {
  get typeTag(): 'Text' {
    return 'Text';
  }
}
export const Text = ClsText;

type KnownBool = ClsBool;
export function isKnownBool<T>(
  x: [Extract<T, Bool>] extends [never] ? never : T,
): x is [Extract<T, Bool>] extends [never]
  ? never
  : Bool extends T // Needed when T is any
  ? Bool
  : Extract<T, Bool> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseBool;
}
export function isExactlyBool(x: any): x is Bool {
  return x?.['typeTag'] === 'Bool';
}

export function ensureKnownBool<T>(
  x: [Extract<T, Bool>] extends [never] ? never : T,
): Bool {
  assert(isKnownBool(x), () => mkUnexpectedTypeMsg([Bool], x));
  return x;
}
export function ensureMaybeKnownBool<T>(
  x: [Extract<T, Bool>] extends [never] ? never : T,
): Bool | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownBool(x);
}

export type Bool = KnownBool;
export interface BoolParams {
  name: string /*  */;
}

abstract class BaseBool extends BaseScalar {
  static isKnown(x: any): x is Bool {
    return isKnownBool(x);
  }
  static getType(): Bool {
    throw new Error();
  }
  static modelTypeName = 'Bool';

  constructor(args: BoolParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.Bool(this, args);
    }
  }
  uid: number;
  name: string /*  */;
}
class ClsBool extends BaseBool {
  get typeTag(): 'Bool' {
    return 'Bool';
  }
}
export const Bool = ClsBool;

type KnownImg = ClsImg;
export function isKnownImg<T>(
  x: [Extract<T, Img>] extends [never] ? never : T,
): x is [Extract<T, Img>] extends [never]
  ? never
  : Img extends T // Needed when T is any
  ? Img
  : Extract<T, Img> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseImg;
}
export function isExactlyImg(x: any): x is Img {
  return x?.['typeTag'] === 'Img';
}

export function ensureKnownImg<T>(
  x: [Extract<T, Img>] extends [never] ? never : T,
): Img {
  assert(isKnownImg(x), () => mkUnexpectedTypeMsg([Img], x));
  return x;
}
export function ensureMaybeKnownImg<T>(
  x: [Extract<T, Img>] extends [never] ? never : T,
): Img | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownImg(x);
}

export type Img = KnownImg;
export interface ImgParams {
  name: string /*  */;
}

abstract class BaseImg extends BaseType {
  static isKnown(x: any): x is Img {
    return isKnownImg(x);
  }
  static getType(): Img {
    throw new Error();
  }
  static modelTypeName = 'Img';

  constructor(args: ImgParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.Img(this, args);
    }
  }
  uid: number;
  name: string /*  */;
}
class ClsImg extends BaseImg {
  get typeTag(): 'Img' {
    return 'Img';
  }
}
export const Img = ClsImg;

type KnownAny = ClsAny;
export function isKnownAny<T>(
  x: [Extract<T, Any>] extends [never] ? never : T,
): x is [Extract<T, Any>] extends [never]
  ? never
  : Any extends T // Needed when T is any
  ? Any
  : Extract<T, Any> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseAny;
}
export function isExactlyAny(x: any): x is Any {
  return x?.['typeTag'] === 'Any';
}

export function ensureKnownAny<T>(
  x: [Extract<T, Any>] extends [never] ? never : T,
): Any {
  assert(isKnownAny(x), () => mkUnexpectedTypeMsg([Any], x));
  return x;
}
export function ensureMaybeKnownAny<T>(
  x: [Extract<T, Any>] extends [never] ? never : T,
): Any | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownAny(x);
}

export type Any = KnownAny;
export interface AnyParams {
  name: string /*  */;
}

abstract class BaseAny extends BaseType {
  static isKnown(x: any): x is Any {
    return isKnownAny(x);
  }
  static getType(): Any {
    throw new Error();
  }
  static modelTypeName = 'Any';

  constructor(args: AnyParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.Any(this, args);
    }
  }
  uid: number;
  name: string /*  */;
}
class ClsAny extends BaseAny {
  get typeTag(): 'Any' {
    return 'Any';
  }
}
export const Any = ClsAny;

type KnownChoice = ClsChoice;
export function isKnownChoice<T>(
  x: [Extract<T, Choice>] extends [never] ? never : T,
): x is [Extract<T, Choice>] extends [never]
  ? never
  : Choice extends T // Needed when T is any
  ? Choice
  : Extract<T, Choice> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseChoice;
}
export function isExactlyChoice(x: any): x is Choice {
  return x?.['typeTag'] === 'Choice';
}

export function ensureKnownChoice<T>(
  x: [Extract<T, Choice>] extends [never] ? never : T,
): Choice {
  assert(isKnownChoice(x), () => mkUnexpectedTypeMsg([Choice], x));
  return x;
}
export function ensureMaybeKnownChoice<T>(
  x: [Extract<T, Choice>] extends [never] ? never : T,
): Choice | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownChoice(x);
}

export type Choice = KnownChoice;
export interface ChoiceParams {
  options:
    | Array<string>
    | Array<{[key: string]: string | number | boolean}> /*  */;
  name: string /*  */;
}

abstract class BaseChoice extends BaseType {
  static isKnown(x: any): x is Choice {
    return isKnownChoice(x);
  }
  static getType(): Choice {
    throw new Error();
  }
  static modelTypeName = 'Choice';

  constructor(args: ChoiceParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.Choice(this, args);
    }
  }
  uid: number;
  options:
    | Array<string>
    | Array<{[key: string]: string | number | boolean}> /*  */;
  name: string /*  */;
}
class ClsChoice extends BaseChoice {
  get typeTag(): 'Choice' {
    return 'Choice';
  }
}
export const Choice = ClsChoice;

type KnownComponentInstance = ClsComponentInstance;
export function isKnownComponentInstance<T>(
  x: [Extract<T, ComponentInstance>] extends [never] ? never : T,
): x is [Extract<T, ComponentInstance>] extends [never]
  ? never
  : ComponentInstance extends T // Needed when T is any
  ? ComponentInstance
  : Extract<T, ComponentInstance> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseComponentInstance;
}
export function isExactlyComponentInstance(x: any): x is ComponentInstance {
  return x?.['typeTag'] === 'ComponentInstance';
}

export function ensureKnownComponentInstance<T>(
  x: [Extract<T, ComponentInstance>] extends [never] ? never : T,
): ComponentInstance {
  assert(isKnownComponentInstance(x), () =>
    mkUnexpectedTypeMsg([ComponentInstance], x),
  );
  return x;
}
export function ensureMaybeKnownComponentInstance<T>(
  x: [Extract<T, ComponentInstance>] extends [never] ? never : T,
): ComponentInstance | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownComponentInstance(x);
}

export type ComponentInstance = KnownComponentInstance;
export interface ComponentInstanceParams {
  component: Component /* WeakRef */;
  name: string /*  */;
}

abstract class BaseComponentInstance extends BaseType {
  static isKnown(x: any): x is ComponentInstance {
    return isKnownComponentInstance(x);
  }
  static getType(): ComponentInstance {
    throw new Error();
  }
  static modelTypeName = 'ComponentInstance';

  constructor(args: ComponentInstanceParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.ComponentInstance(this, args);
    }
  }
  uid: number;
  component: Component /* WeakRef */;
  name: string /*  */;
}
class ClsComponentInstance extends BaseComponentInstance {
  get typeTag(): 'ComponentInstance' {
    return 'ComponentInstance';
  }
}
export const ComponentInstance = ClsComponentInstance;

type KnownPlumeInstance = ClsPlumeInstance;
export function isKnownPlumeInstance<T>(
  x: [Extract<T, PlumeInstance>] extends [never] ? never : T,
): x is [Extract<T, PlumeInstance>] extends [never]
  ? never
  : PlumeInstance extends T // Needed when T is any
  ? PlumeInstance
  : Extract<T, PlumeInstance> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BasePlumeInstance;
}
export function isExactlyPlumeInstance(x: any): x is PlumeInstance {
  return x?.['typeTag'] === 'PlumeInstance';
}

export function ensureKnownPlumeInstance<T>(
  x: [Extract<T, PlumeInstance>] extends [never] ? never : T,
): PlumeInstance {
  assert(isKnownPlumeInstance(x), () =>
    mkUnexpectedTypeMsg([PlumeInstance], x),
  );
  return x;
}
export function ensureMaybeKnownPlumeInstance<T>(
  x: [Extract<T, PlumeInstance>] extends [never] ? never : T,
): PlumeInstance | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownPlumeInstance(x);
}

export type PlumeInstance = KnownPlumeInstance;
export interface PlumeInstanceParams {
  plumeType: string /*  */;
  name: string /*  */;
}

abstract class BasePlumeInstance extends BaseType {
  static isKnown(x: any): x is PlumeInstance {
    return isKnownPlumeInstance(x);
  }
  static getType(): PlumeInstance {
    throw new Error();
  }
  static modelTypeName = 'PlumeInstance';

  constructor(args: PlumeInstanceParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.PlumeInstance(this, args);
    }
  }
  uid: number;
  plumeType: string /*  */;
  name: string /*  */;
}
class ClsPlumeInstance extends BasePlumeInstance {
  get typeTag(): 'PlumeInstance' {
    return 'PlumeInstance';
  }
}
export const PlumeInstance = ClsPlumeInstance;

type KnownUserType = KnownOpaqueType | KnownRenderFuncType;
export function isKnownUserType<T>(
  x: [Extract<T, UserType>] extends [never] ? never : T,
): x is [Extract<T, UserType>] extends [never]
  ? never
  : UserType extends T // Needed when T is any
  ? UserType
  : Extract<T, UserType> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseUserType;
}

export function ensureKnownUserType<T>(
  x: [Extract<T, UserType>] extends [never] ? never : T,
): UserType {
  assert(isKnownUserType(x), () => mkUnexpectedTypeMsg([UserType], x));
  return x;
}
export function ensureMaybeKnownUserType<T>(
  x: [Extract<T, UserType>] extends [never] ? never : T,
): UserType | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownUserType(x);
}

export type UserType = KnownUserType;
export interface UserTypeParams {
  name: string /*  */;
}

abstract class BaseUserType extends BaseType {
  static isKnown(x: any): x is UserType {
    return isKnownUserType(x);
  }
  static getType(): UserType {
    throw new Error();
  }
  static modelTypeName = 'UserType';

  constructor(args: UserTypeParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.UserType(this, args);
    }
  }
  uid: number;
  name: string /*  */;
}

export const UserType = BaseUserType;

type KnownQueryData = ClsQueryData;
export function isKnownQueryData<T>(
  x: [Extract<T, QueryData>] extends [never] ? never : T,
): x is [Extract<T, QueryData>] extends [never]
  ? never
  : QueryData extends T // Needed when T is any
  ? QueryData
  : Extract<T, QueryData> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseQueryData;
}
export function isExactlyQueryData(x: any): x is QueryData {
  return x?.['typeTag'] === 'QueryData';
}

export function ensureKnownQueryData<T>(
  x: [Extract<T, QueryData>] extends [never] ? never : T,
): QueryData {
  assert(isKnownQueryData(x), () => mkUnexpectedTypeMsg([QueryData], x));
  return x;
}
export function ensureMaybeKnownQueryData<T>(
  x: [Extract<T, QueryData>] extends [never] ? never : T,
): QueryData | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownQueryData(x);
}

export type QueryData = KnownQueryData;
export interface QueryDataParams {
  name: string /*  */;
}

abstract class BaseQueryData extends BaseType {
  static isKnown(x: any): x is QueryData {
    return isKnownQueryData(x);
  }
  static getType(): QueryData {
    throw new Error();
  }
  static modelTypeName = 'QueryData';

  constructor(args: QueryDataParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.QueryData(this, args);
    }
  }
  uid: number;
  name: string /*  */;
}
class ClsQueryData extends BaseQueryData {
  get typeTag(): 'QueryData' {
    return 'QueryData';
  }
}
export const QueryData = ClsQueryData;

type KnownFunctionType = ClsFunctionType;
export function isKnownFunctionType<T>(
  x: [Extract<T, FunctionType>] extends [never] ? never : T,
): x is [Extract<T, FunctionType>] extends [never]
  ? never
  : FunctionType extends T // Needed when T is any
  ? FunctionType
  : Extract<T, FunctionType> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseFunctionType;
}
export function isExactlyFunctionType(x: any): x is FunctionType {
  return x?.['typeTag'] === 'FunctionType';
}

export function ensureKnownFunctionType<T>(
  x: [Extract<T, FunctionType>] extends [never] ? never : T,
): FunctionType {
  assert(isKnownFunctionType(x), () => mkUnexpectedTypeMsg([FunctionType], x));
  return x;
}
export function ensureMaybeKnownFunctionType<T>(
  x: [Extract<T, FunctionType>] extends [never] ? never : T,
): FunctionType | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownFunctionType(x);
}

export type FunctionType = KnownFunctionType;
export interface FunctionTypeParams {
  params: Array<ArgType> /*  */;
  name: string /*  */;
}

abstract class BaseFunctionType extends BaseType {
  static isKnown(x: any): x is FunctionType {
    return isKnownFunctionType(x);
  }
  static getType(): FunctionType {
    throw new Error();
  }
  static modelTypeName = 'FunctionType';

  constructor(args: FunctionTypeParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.FunctionType(this, args);
    }
  }
  uid: number;
  params: Array<ArgType> /*  */;
  name: string /*  */;
}
class ClsFunctionType extends BaseFunctionType {
  get typeTag(): 'FunctionType' {
    return 'FunctionType';
  }
}
export const FunctionType = ClsFunctionType;

type KnownArgType = ClsArgType;
export function isKnownArgType<T>(
  x: [Extract<T, ArgType>] extends [never] ? never : T,
): x is [Extract<T, ArgType>] extends [never]
  ? never
  : ArgType extends T // Needed when T is any
  ? ArgType
  : Extract<T, ArgType> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseArgType;
}
export function isExactlyArgType(x: any): x is ArgType {
  return x?.['typeTag'] === 'ArgType';
}

export function ensureKnownArgType<T>(
  x: [Extract<T, ArgType>] extends [never] ? never : T,
): ArgType {
  assert(isKnownArgType(x), () => mkUnexpectedTypeMsg([ArgType], x));
  return x;
}
export function ensureMaybeKnownArgType<T>(
  x: [Extract<T, ArgType>] extends [never] ? never : T,
): ArgType | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownArgType(x);
}

export type ArgType = KnownArgType;
export interface ArgTypeParams {
  argName: string /*  */;
  displayName: string | null | undefined /*  */;
  type: Type /*  */;
  name: string /*  */;
}

abstract class BaseArgType extends BaseType {
  static isKnown(x: any): x is ArgType {
    return isKnownArgType(x);
  }
  static getType(): ArgType {
    throw new Error();
  }
  static modelTypeName = 'ArgType';

  constructor(args: ArgTypeParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.ArgType(this, args);
    }
  }
  uid: number;
  argName: string /*  */;
  displayName: string | null | undefined /*  */;
  type: Type /*  */;
  name: string /*  */;
}
class ClsArgType extends BaseArgType {
  get typeTag(): 'ArgType' {
    return 'ArgType';
  }
}
export const ArgType = ClsArgType;

type KnownClassNamePropType = ClsClassNamePropType;
export function isKnownClassNamePropType<T>(
  x: [Extract<T, ClassNamePropType>] extends [never] ? never : T,
): x is [Extract<T, ClassNamePropType>] extends [never]
  ? never
  : ClassNamePropType extends T // Needed when T is any
  ? ClassNamePropType
  : Extract<T, ClassNamePropType> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseClassNamePropType;
}
export function isExactlyClassNamePropType(x: any): x is ClassNamePropType {
  return x?.['typeTag'] === 'ClassNamePropType';
}

export function ensureKnownClassNamePropType<T>(
  x: [Extract<T, ClassNamePropType>] extends [never] ? never : T,
): ClassNamePropType {
  assert(isKnownClassNamePropType(x), () =>
    mkUnexpectedTypeMsg([ClassNamePropType], x),
  );
  return x;
}
export function ensureMaybeKnownClassNamePropType<T>(
  x: [Extract<T, ClassNamePropType>] extends [never] ? never : T,
): ClassNamePropType | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownClassNamePropType(x);
}

export type ClassNamePropType = KnownClassNamePropType;
export interface ClassNamePropTypeParams {
  selectors: Array<LabeledSelector> /*  */;
  name: string /*  */;
}

abstract class BaseClassNamePropType extends BaseType {
  static isKnown(x: any): x is ClassNamePropType {
    return isKnownClassNamePropType(x);
  }
  static getType(): ClassNamePropType {
    throw new Error();
  }
  static modelTypeName = 'ClassNamePropType';

  constructor(args: ClassNamePropTypeParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.ClassNamePropType(this, args);
    }
  }
  uid: number;
  selectors: Array<LabeledSelector> /*  */;
  name: string /*  */;
}
class ClsClassNamePropType extends BaseClassNamePropType {
  get typeTag(): 'ClassNamePropType' {
    return 'ClassNamePropType';
  }
}
export const ClassNamePropType = ClsClassNamePropType;

type KnownStyleScopeClassNamePropType = ClsStyleScopeClassNamePropType;
export function isKnownStyleScopeClassNamePropType<T>(
  x: [Extract<T, StyleScopeClassNamePropType>] extends [never] ? never : T,
): x is [Extract<T, StyleScopeClassNamePropType>] extends [never]
  ? never
  : StyleScopeClassNamePropType extends T // Needed when T is any
  ? StyleScopeClassNamePropType
  : Extract<T, StyleScopeClassNamePropType> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseStyleScopeClassNamePropType;
}
export function isExactlyStyleScopeClassNamePropType(
  x: any,
): x is StyleScopeClassNamePropType {
  return x?.['typeTag'] === 'StyleScopeClassNamePropType';
}

export function ensureKnownStyleScopeClassNamePropType<T>(
  x: [Extract<T, StyleScopeClassNamePropType>] extends [never] ? never : T,
): StyleScopeClassNamePropType {
  assert(isKnownStyleScopeClassNamePropType(x), () =>
    mkUnexpectedTypeMsg([StyleScopeClassNamePropType], x),
  );
  return x;
}
export function ensureMaybeKnownStyleScopeClassNamePropType<T>(
  x: [Extract<T, StyleScopeClassNamePropType>] extends [never] ? never : T,
): StyleScopeClassNamePropType | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownStyleScopeClassNamePropType(x);
}

export type StyleScopeClassNamePropType = KnownStyleScopeClassNamePropType;
export interface StyleScopeClassNamePropTypeParams {
  scopeName: string /*  */;
  name: string /*  */;
}

abstract class BaseStyleScopeClassNamePropType extends BaseType {
  static isKnown(x: any): x is StyleScopeClassNamePropType {
    return isKnownStyleScopeClassNamePropType(x);
  }
  static getType(): StyleScopeClassNamePropType {
    throw new Error();
  }
  static modelTypeName = 'StyleScopeClassNamePropType';

  constructor(args: StyleScopeClassNamePropTypeParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.StyleScopeClassNamePropType(this, args);
    }
  }
  uid: number;
  scopeName: string /*  */;
  name: string /*  */;
}
class ClsStyleScopeClassNamePropType extends BaseStyleScopeClassNamePropType {
  get typeTag(): 'StyleScopeClassNamePropType' {
    return 'StyleScopeClassNamePropType';
  }
}
export const StyleScopeClassNamePropType = ClsStyleScopeClassNamePropType;

type KnownDefaultStylesClassNamePropType = ClsDefaultStylesClassNamePropType;
export function isKnownDefaultStylesClassNamePropType<T>(
  x: [Extract<T, DefaultStylesClassNamePropType>] extends [never] ? never : T,
): x is [Extract<T, DefaultStylesClassNamePropType>] extends [never]
  ? never
  : DefaultStylesClassNamePropType extends T // Needed when T is any
  ? DefaultStylesClassNamePropType
  : Extract<T, DefaultStylesClassNamePropType> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseDefaultStylesClassNamePropType;
}
export function isExactlyDefaultStylesClassNamePropType(
  x: any,
): x is DefaultStylesClassNamePropType {
  return x?.['typeTag'] === 'DefaultStylesClassNamePropType';
}

export function ensureKnownDefaultStylesClassNamePropType<T>(
  x: [Extract<T, DefaultStylesClassNamePropType>] extends [never] ? never : T,
): DefaultStylesClassNamePropType {
  assert(isKnownDefaultStylesClassNamePropType(x), () =>
    mkUnexpectedTypeMsg([DefaultStylesClassNamePropType], x),
  );
  return x;
}
export function ensureMaybeKnownDefaultStylesClassNamePropType<T>(
  x: [Extract<T, DefaultStylesClassNamePropType>] extends [never] ? never : T,
): DefaultStylesClassNamePropType | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownDefaultStylesClassNamePropType(x);
}

export type DefaultStylesClassNamePropType =
  KnownDefaultStylesClassNamePropType;
export interface DefaultStylesClassNamePropTypeParams {
  includeTagStyles: boolean /*  */;
  name: string /*  */;
}

abstract class BaseDefaultStylesClassNamePropType extends BaseType {
  static isKnown(x: any): x is DefaultStylesClassNamePropType {
    return isKnownDefaultStylesClassNamePropType(x);
  }
  static getType(): DefaultStylesClassNamePropType {
    throw new Error();
  }
  static modelTypeName = 'DefaultStylesClassNamePropType';

  constructor(args: DefaultStylesClassNamePropTypeParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.DefaultStylesClassNamePropType(this, args);
    }
  }
  uid: number;
  includeTagStyles: boolean /*  */;
  name: string /*  */;
}
class ClsDefaultStylesClassNamePropType extends BaseDefaultStylesClassNamePropType {
  get typeTag(): 'DefaultStylesClassNamePropType' {
    return 'DefaultStylesClassNamePropType';
  }
}
export const DefaultStylesClassNamePropType = ClsDefaultStylesClassNamePropType;

type KnownDefaultStylesPropType = ClsDefaultStylesPropType;
export function isKnownDefaultStylesPropType<T>(
  x: [Extract<T, DefaultStylesPropType>] extends [never] ? never : T,
): x is [Extract<T, DefaultStylesPropType>] extends [never]
  ? never
  : DefaultStylesPropType extends T // Needed when T is any
  ? DefaultStylesPropType
  : Extract<T, DefaultStylesPropType> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseDefaultStylesPropType;
}
export function isExactlyDefaultStylesPropType(
  x: any,
): x is DefaultStylesPropType {
  return x?.['typeTag'] === 'DefaultStylesPropType';
}

export function ensureKnownDefaultStylesPropType<T>(
  x: [Extract<T, DefaultStylesPropType>] extends [never] ? never : T,
): DefaultStylesPropType {
  assert(isKnownDefaultStylesPropType(x), () =>
    mkUnexpectedTypeMsg([DefaultStylesPropType], x),
  );
  return x;
}
export function ensureMaybeKnownDefaultStylesPropType<T>(
  x: [Extract<T, DefaultStylesPropType>] extends [never] ? never : T,
): DefaultStylesPropType | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownDefaultStylesPropType(x);
}

export type DefaultStylesPropType = KnownDefaultStylesPropType;
export interface DefaultStylesPropTypeParams {
  name: string /*  */;
}

abstract class BaseDefaultStylesPropType extends BaseType {
  static isKnown(x: any): x is DefaultStylesPropType {
    return isKnownDefaultStylesPropType(x);
  }
  static getType(): DefaultStylesPropType {
    throw new Error();
  }
  static modelTypeName = 'DefaultStylesPropType';

  constructor(args: DefaultStylesPropTypeParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.DefaultStylesPropType(this, args);
    }
  }
  uid: number;
  name: string /*  */;
}
class ClsDefaultStylesPropType extends BaseDefaultStylesPropType {
  get typeTag(): 'DefaultStylesPropType' {
    return 'DefaultStylesPropType';
  }
}
export const DefaultStylesPropType = ClsDefaultStylesPropType;

type KnownColorPropType = ClsColorPropType;
export function isKnownColorPropType<T>(
  x: [Extract<T, ColorPropType>] extends [never] ? never : T,
): x is [Extract<T, ColorPropType>] extends [never]
  ? never
  : ColorPropType extends T // Needed when T is any
  ? ColorPropType
  : Extract<T, ColorPropType> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseColorPropType;
}
export function isExactlyColorPropType(x: any): x is ColorPropType {
  return x?.['typeTag'] === 'ColorPropType';
}

export function ensureKnownColorPropType<T>(
  x: [Extract<T, ColorPropType>] extends [never] ? never : T,
): ColorPropType {
  assert(isKnownColorPropType(x), () =>
    mkUnexpectedTypeMsg([ColorPropType], x),
  );
  return x;
}
export function ensureMaybeKnownColorPropType<T>(
  x: [Extract<T, ColorPropType>] extends [never] ? never : T,
): ColorPropType | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownColorPropType(x);
}

export type ColorPropType = KnownColorPropType;
export interface ColorPropTypeParams {
  noDeref: boolean /*  */;
  name: string /*  */;
}

abstract class BaseColorPropType extends BaseType {
  static isKnown(x: any): x is ColorPropType {
    return isKnownColorPropType(x);
  }
  static getType(): ColorPropType {
    throw new Error();
  }
  static modelTypeName = 'ColorPropType';

  constructor(args: ColorPropTypeParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.ColorPropType(this, args);
    }
  }
  uid: number;
  noDeref: boolean /*  */;
  name: string /*  */;
}
class ClsColorPropType extends BaseColorPropType {
  get typeTag(): 'ColorPropType' {
    return 'ColorPropType';
  }
}
export const ColorPropType = ClsColorPropType;

type KnownVariantedValue = ClsVariantedValue;
export function isKnownVariantedValue<T>(
  x: [Extract<T, VariantedValue>] extends [never] ? never : T,
): x is [Extract<T, VariantedValue>] extends [never]
  ? never
  : VariantedValue extends T // Needed when T is any
  ? VariantedValue
  : Extract<T, VariantedValue> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseVariantedValue;
}
export function isExactlyVariantedValue(x: any): x is VariantedValue {
  return x?.['typeTag'] === 'VariantedValue';
}

export function ensureKnownVariantedValue<T>(
  x: [Extract<T, VariantedValue>] extends [never] ? never : T,
): VariantedValue {
  assert(isKnownVariantedValue(x), () =>
    mkUnexpectedTypeMsg([VariantedValue], x),
  );
  return x;
}
export function ensureMaybeKnownVariantedValue<T>(
  x: [Extract<T, VariantedValue>] extends [never] ? never : T,
): VariantedValue | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownVariantedValue(x);
}

export type VariantedValue = KnownVariantedValue;
export interface VariantedValueParams {
  variants: Array<Variant> /* WeakRef */;
  value: string /*  */;
}

abstract class BaseVariantedValue {
  static isKnown(x: any): x is VariantedValue {
    return isKnownVariantedValue(x);
  }
  static getType(): VariantedValue {
    throw new Error();
  }
  static modelTypeName = 'VariantedValue';

  constructor(args: VariantedValueParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.VariantedValue(this, args);
    }
  }
  uid: number;
  variants: Array<Variant> /* WeakRef */;
  value: string /*  */;
}
class ClsVariantedValue extends BaseVariantedValue {
  get typeTag(): 'VariantedValue' {
    return 'VariantedValue';
  }
}
export const VariantedValue = ClsVariantedValue;

type KnownStyleToken = ClsStyleToken;
export function isKnownStyleToken<T>(
  x: [Extract<T, StyleToken>] extends [never] ? never : T,
): x is [Extract<T, StyleToken>] extends [never]
  ? never
  : StyleToken extends T // Needed when T is any
  ? StyleToken
  : Extract<T, StyleToken> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseStyleToken;
}
export function isExactlyStyleToken(x: any): x is StyleToken {
  return x?.['typeTag'] === 'StyleToken';
}

export function ensureKnownStyleToken<T>(
  x: [Extract<T, StyleToken>] extends [never] ? never : T,
): StyleToken {
  assert(isKnownStyleToken(x), () => mkUnexpectedTypeMsg([StyleToken], x));
  return x;
}
export function ensureMaybeKnownStyleToken<T>(
  x: [Extract<T, StyleToken>] extends [never] ? never : T,
): StyleToken | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownStyleToken(x);
}

export type StyleToken = KnownStyleToken;
export interface StyleTokenParams {
  name: string /*  */;
  readonly type: string /* Const */;
  readonly uuid: string /* Const */;
  value: string /*  */;
  variantedValues: Array<VariantedValue> /*  */;
  isRegistered: boolean /*  */;
  regKey: string | null | undefined /*  */;
}

abstract class BaseStyleToken {
  static isKnown(x: any): x is StyleToken {
    return isKnownStyleToken(x);
  }
  static getType(): StyleToken {
    throw new Error();
  }
  static modelTypeName = 'StyleToken';

  constructor(args: StyleTokenParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.StyleToken(this, args);
    }
  }
  uid: number;
  name: string /*  */;
  readonly type: string /* Const */;
  readonly uuid: string /* Const */;
  value: string /*  */;
  variantedValues: Array<VariantedValue> /*  */;
  isRegistered: boolean /*  */;
  regKey: string | null | undefined /*  */;
}
class ClsStyleToken extends BaseStyleToken {
  get typeTag(): 'StyleToken' {
    return 'StyleToken';
  }
}
export const StyleToken = ClsStyleToken;

type KnownHostLessPackageInfo = ClsHostLessPackageInfo;
export function isKnownHostLessPackageInfo<T>(
  x: [Extract<T, HostLessPackageInfo>] extends [never] ? never : T,
): x is [Extract<T, HostLessPackageInfo>] extends [never]
  ? never
  : HostLessPackageInfo extends T // Needed when T is any
  ? HostLessPackageInfo
  : Extract<T, HostLessPackageInfo> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseHostLessPackageInfo;
}
export function isExactlyHostLessPackageInfo(x: any): x is HostLessPackageInfo {
  return x?.['typeTag'] === 'HostLessPackageInfo';
}

export function ensureKnownHostLessPackageInfo<T>(
  x: [Extract<T, HostLessPackageInfo>] extends [never] ? never : T,
): HostLessPackageInfo {
  assert(isKnownHostLessPackageInfo(x), () =>
    mkUnexpectedTypeMsg([HostLessPackageInfo], x),
  );
  return x;
}
export function ensureMaybeKnownHostLessPackageInfo<T>(
  x: [Extract<T, HostLessPackageInfo>] extends [never] ? never : T,
): HostLessPackageInfo | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownHostLessPackageInfo(x);
}

export type HostLessPackageInfo = KnownHostLessPackageInfo;
export interface HostLessPackageInfoParams {
  name: string /*  */;
  npmPkg: Array<string> /*  */;
  cssImport: Array<string> /*  */;
  deps: Array<string> /*  */;
  registerCalls: Array<string> /*  */;
  minimumReactVersion: string | null | undefined /*  */;
}

abstract class BaseHostLessPackageInfo {
  static isKnown(x: any): x is HostLessPackageInfo {
    return isKnownHostLessPackageInfo(x);
  }
  static getType(): HostLessPackageInfo {
    throw new Error();
  }
  static modelTypeName = 'HostLessPackageInfo';

  constructor(args: HostLessPackageInfoParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.HostLessPackageInfo(this, args);
    }
  }
  uid: number;
  name: string /*  */;
  npmPkg: Array<string> /*  */;
  cssImport: Array<string> /*  */;
  deps: Array<string> /*  */;
  registerCalls: Array<string> /*  */;
  minimumReactVersion: string | null | undefined /*  */;
}
class ClsHostLessPackageInfo extends BaseHostLessPackageInfo {
  get typeTag(): 'HostLessPackageInfo' {
    return 'HostLessPackageInfo';
  }
}
export const HostLessPackageInfo = ClsHostLessPackageInfo;

type KnownSite = ClsSite;
export function isKnownSite<T>(
  x: [Extract<T, Site>] extends [never] ? never : T,
): x is [Extract<T, Site>] extends [never]
  ? never
  : Site extends T // Needed when T is any
  ? Site
  : Extract<T, Site> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseSite;
}
export function isExactlySite(x: any): x is Site {
  return x?.['typeTag'] === 'Site';
}

export function ensureKnownSite<T>(
  x: [Extract<T, Site>] extends [never] ? never : T,
): Site {
  assert(isKnownSite(x), () => mkUnexpectedTypeMsg([Site], x));
  return x;
}
export function ensureMaybeKnownSite<T>(
  x: [Extract<T, Site>] extends [never] ? never : T,
): Site | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownSite(x);
}

export type Site = KnownSite;
export interface SiteParams {
  components: Array<Component> /*  */;
  arenas: Array<Arena> /*  */;
  pageArenas: Array<PageArena> /*  */;
  componentArenas: Array<ComponentArena> /*  */;
  _focusedFrameArenas?:
    | Array<FocusedFrameArena>
    | null
    | undefined /* Transient */;
  globalVariantGroups: Array<VariantGroup> /*  */;
  userManagedFonts: Array<string> /*  */;
  readonly globalVariant: Variant /* Const */;
  styleTokens: Array<StyleToken> /*  */;
  mixins: Array<Mixin> /*  */;
  readonly themes: Array<Theme> /* Const */;
  activeTheme: Theme | null | undefined /* WeakRef */;
  imageAssets: Array<ImageAsset> /*  */;
  projectDependencies: Array<ProjectDependency> /* WeakRef */;
  activeScreenVariantGroup: VariantGroup | null | undefined /* WeakRef */;
  flags: {[key: string]: string | boolean | number | null | undefined} /*  */;
  readonly hostLessPackageInfo:
    | HostLessPackageInfo
    | null
    | undefined /* Const */;
  globalContexts: Array<TplComponent> /*  */;
  splits: Array<Split> /*  */;
  defaultComponents: {[key: string]: Component} /* WeakRef */;
  defaultPageRoleId: string | null | undefined /*  */;
  pageWrapper: Component | null | undefined /* WeakRef */;
}

abstract class BaseSite {
  static isKnown(x: any): x is Site {
    return isKnownSite(x);
  }
  static getType(): Site {
    throw new Error();
  }
  static modelTypeName = 'Site';

  constructor(args: SiteParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.Site(this, args);
    }
  }
  uid: number;
  components: Array<Component> /*  */;
  arenas: Array<Arena> /*  */;
  pageArenas: Array<PageArena> /*  */;
  componentArenas: Array<ComponentArena> /*  */;
  _focusedFrameArenas?: Array<FocusedFrameArena> | null | undefined =
    null /* Transient */;
  globalVariantGroups: Array<VariantGroup> /*  */;
  userManagedFonts: Array<string> /*  */;
  readonly globalVariant: Variant /* Const */;
  styleTokens: Array<StyleToken> /*  */;
  mixins: Array<Mixin> /*  */;
  readonly themes: Array<Theme> /* Const */;
  activeTheme: Theme | null | undefined /* WeakRef */;
  imageAssets: Array<ImageAsset> /*  */;
  projectDependencies: Array<ProjectDependency> /* WeakRef */;
  activeScreenVariantGroup: VariantGroup | null | undefined /* WeakRef */;
  flags: {[key: string]: string | boolean | number | null | undefined} /*  */;
  readonly hostLessPackageInfo:
    | HostLessPackageInfo
    | null
    | undefined /* Const */;
  globalContexts: Array<TplComponent> /*  */;
  splits: Array<Split> /*  */;
  defaultComponents: {[key: string]: Component} /* WeakRef */;
  defaultPageRoleId: string | null | undefined /*  */;
  pageWrapper: Component | null | undefined /* WeakRef */;
}
class ClsSite extends BaseSite {
  get typeTag(): 'Site' {
    return 'Site';
  }
}
export const Site = ClsSite;

type KnownArenaFrameGrid = ClsArenaFrameGrid;
export function isKnownArenaFrameGrid<T>(
  x: [Extract<T, ArenaFrameGrid>] extends [never] ? never : T,
): x is [Extract<T, ArenaFrameGrid>] extends [never]
  ? never
  : ArenaFrameGrid extends T // Needed when T is any
  ? ArenaFrameGrid
  : Extract<T, ArenaFrameGrid> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseArenaFrameGrid;
}
export function isExactlyArenaFrameGrid(x: any): x is ArenaFrameGrid {
  return x?.['typeTag'] === 'ArenaFrameGrid';
}

export function ensureKnownArenaFrameGrid<T>(
  x: [Extract<T, ArenaFrameGrid>] extends [never] ? never : T,
): ArenaFrameGrid {
  assert(isKnownArenaFrameGrid(x), () =>
    mkUnexpectedTypeMsg([ArenaFrameGrid], x),
  );
  return x;
}
export function ensureMaybeKnownArenaFrameGrid<T>(
  x: [Extract<T, ArenaFrameGrid>] extends [never] ? never : T,
): ArenaFrameGrid | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownArenaFrameGrid(x);
}

export type ArenaFrameGrid = KnownArenaFrameGrid;
export interface ArenaFrameGridParams {
  rows: Array<ArenaFrameRow> /*  */;
}

abstract class BaseArenaFrameGrid {
  static isKnown(x: any): x is ArenaFrameGrid {
    return isKnownArenaFrameGrid(x);
  }
  static getType(): ArenaFrameGrid {
    throw new Error();
  }
  static modelTypeName = 'ArenaFrameGrid';

  constructor(args: ArenaFrameGridParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.ArenaFrameGrid(this, args);
    }
  }
  uid: number;
  rows: Array<ArenaFrameRow> /*  */;
}
class ClsArenaFrameGrid extends BaseArenaFrameGrid {
  get typeTag(): 'ArenaFrameGrid' {
    return 'ArenaFrameGrid';
  }
}
export const ArenaFrameGrid = ClsArenaFrameGrid;

type KnownArenaFrameRow = ClsArenaFrameRow;
export function isKnownArenaFrameRow<T>(
  x: [Extract<T, ArenaFrameRow>] extends [never] ? never : T,
): x is [Extract<T, ArenaFrameRow>] extends [never]
  ? never
  : ArenaFrameRow extends T // Needed when T is any
  ? ArenaFrameRow
  : Extract<T, ArenaFrameRow> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseArenaFrameRow;
}
export function isExactlyArenaFrameRow(x: any): x is ArenaFrameRow {
  return x?.['typeTag'] === 'ArenaFrameRow';
}

export function ensureKnownArenaFrameRow<T>(
  x: [Extract<T, ArenaFrameRow>] extends [never] ? never : T,
): ArenaFrameRow {
  assert(isKnownArenaFrameRow(x), () =>
    mkUnexpectedTypeMsg([ArenaFrameRow], x),
  );
  return x;
}
export function ensureMaybeKnownArenaFrameRow<T>(
  x: [Extract<T, ArenaFrameRow>] extends [never] ? never : T,
): ArenaFrameRow | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownArenaFrameRow(x);
}

export type ArenaFrameRow = KnownArenaFrameRow;
export interface ArenaFrameRowParams {
  cols: Array<ArenaFrameCell> /*  */;
  rowKey:
    | VariantGroup
    | null
    | undefined
    | Variant
    | null
    | undefined /* WeakRef */;
}

abstract class BaseArenaFrameRow {
  static isKnown(x: any): x is ArenaFrameRow {
    return isKnownArenaFrameRow(x);
  }
  static getType(): ArenaFrameRow {
    throw new Error();
  }
  static modelTypeName = 'ArenaFrameRow';

  constructor(args: ArenaFrameRowParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.ArenaFrameRow(this, args);
    }
  }
  uid: number;
  cols: Array<ArenaFrameCell> /*  */;
  rowKey:
    | VariantGroup
    | null
    | undefined
    | Variant
    | null
    | undefined /* WeakRef */;
}
class ClsArenaFrameRow extends BaseArenaFrameRow {
  get typeTag(): 'ArenaFrameRow' {
    return 'ArenaFrameRow';
  }
}
export const ArenaFrameRow = ClsArenaFrameRow;

type KnownArenaFrameCell = ClsArenaFrameCell;
export function isKnownArenaFrameCell<T>(
  x: [Extract<T, ArenaFrameCell>] extends [never] ? never : T,
): x is [Extract<T, ArenaFrameCell>] extends [never]
  ? never
  : ArenaFrameCell extends T // Needed when T is any
  ? ArenaFrameCell
  : Extract<T, ArenaFrameCell> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseArenaFrameCell;
}
export function isExactlyArenaFrameCell(x: any): x is ArenaFrameCell {
  return x?.['typeTag'] === 'ArenaFrameCell';
}

export function ensureKnownArenaFrameCell<T>(
  x: [Extract<T, ArenaFrameCell>] extends [never] ? never : T,
): ArenaFrameCell {
  assert(isKnownArenaFrameCell(x), () =>
    mkUnexpectedTypeMsg([ArenaFrameCell], x),
  );
  return x;
}
export function ensureMaybeKnownArenaFrameCell<T>(
  x: [Extract<T, ArenaFrameCell>] extends [never] ? never : T,
): ArenaFrameCell | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownArenaFrameCell(x);
}

export type ArenaFrameCell = KnownArenaFrameCell;
export interface ArenaFrameCellParams {
  readonly frame: ArenaFrame /* Const */;
  cellKey:
    | Variant
    | null
    | undefined
    | Array<Variant>
    | null
    | undefined /* WeakRef */;
}

abstract class BaseArenaFrameCell {
  static isKnown(x: any): x is ArenaFrameCell {
    return isKnownArenaFrameCell(x);
  }
  static getType(): ArenaFrameCell {
    throw new Error();
  }
  static modelTypeName = 'ArenaFrameCell';

  constructor(args: ArenaFrameCellParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.ArenaFrameCell(this, args);
    }
  }
  uid: number;
  readonly frame: ArenaFrame /* Const */;
  cellKey:
    | Variant
    | null
    | undefined
    | Array<Variant>
    | null
    | undefined /* WeakRef */;
}
class ClsArenaFrameCell extends BaseArenaFrameCell {
  get typeTag(): 'ArenaFrameCell' {
    return 'ArenaFrameCell';
  }
}
export const ArenaFrameCell = ClsArenaFrameCell;

type KnownComponentArena = ClsComponentArena;
export function isKnownComponentArena<T>(
  x: [Extract<T, ComponentArena>] extends [never] ? never : T,
): x is [Extract<T, ComponentArena>] extends [never]
  ? never
  : ComponentArena extends T // Needed when T is any
  ? ComponentArena
  : Extract<T, ComponentArena> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseComponentArena;
}
export function isExactlyComponentArena(x: any): x is ComponentArena {
  return x?.['typeTag'] === 'ComponentArena';
}

export function ensureKnownComponentArena<T>(
  x: [Extract<T, ComponentArena>] extends [never] ? never : T,
): ComponentArena {
  assert(isKnownComponentArena(x), () =>
    mkUnexpectedTypeMsg([ComponentArena], x),
  );
  return x;
}
export function ensureMaybeKnownComponentArena<T>(
  x: [Extract<T, ComponentArena>] extends [never] ? never : T,
): ComponentArena | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownComponentArena(x);
}

export type ComponentArena = KnownComponentArena;
export interface ComponentArenaParams {
  readonly component: Component /* Const,WeakRef */;
  matrix: ArenaFrameGrid /*  */;
  customMatrix: ArenaFrameGrid /*  */;
}

abstract class BaseComponentArena {
  static isKnown(x: any): x is ComponentArena {
    return isKnownComponentArena(x);
  }
  static getType(): ComponentArena {
    throw new Error();
  }
  static modelTypeName = 'ComponentArena';

  constructor(args: ComponentArenaParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.ComponentArena(this, args);
    }
  }
  uid: number;
  readonly component: Component /* Const,WeakRef */;
  matrix: ArenaFrameGrid /*  */;
  customMatrix: ArenaFrameGrid /*  */;
}
class ClsComponentArena extends BaseComponentArena {
  get typeTag(): 'ComponentArena' {
    return 'ComponentArena';
  }
}
export const ComponentArena = ClsComponentArena;

type KnownPageArena = ClsPageArena;
export function isKnownPageArena<T>(
  x: [Extract<T, PageArena>] extends [never] ? never : T,
): x is [Extract<T, PageArena>] extends [never]
  ? never
  : PageArena extends T // Needed when T is any
  ? PageArena
  : Extract<T, PageArena> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BasePageArena;
}
export function isExactlyPageArena(x: any): x is PageArena {
  return x?.['typeTag'] === 'PageArena';
}

export function ensureKnownPageArena<T>(
  x: [Extract<T, PageArena>] extends [never] ? never : T,
): PageArena {
  assert(isKnownPageArena(x), () => mkUnexpectedTypeMsg([PageArena], x));
  return x;
}
export function ensureMaybeKnownPageArena<T>(
  x: [Extract<T, PageArena>] extends [never] ? never : T,
): PageArena | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownPageArena(x);
}

export type PageArena = KnownPageArena;
export interface PageArenaParams {
  readonly component: Component /* Const,WeakRef */;
  matrix: ArenaFrameGrid /*  */;
}

abstract class BasePageArena {
  static isKnown(x: any): x is PageArena {
    return isKnownPageArena(x);
  }
  static getType(): PageArena {
    throw new Error();
  }
  static modelTypeName = 'PageArena';

  constructor(args: PageArenaParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.PageArena(this, args);
    }
  }
  uid: number;
  readonly component: Component /* Const,WeakRef */;
  matrix: ArenaFrameGrid /*  */;
}
class ClsPageArena extends BasePageArena {
  get typeTag(): 'PageArena' {
    return 'PageArena';
  }
}
export const PageArena = ClsPageArena;

type KnownArena = ClsArena;
export function isKnownArena<T>(
  x: [Extract<T, Arena>] extends [never] ? never : T,
): x is [Extract<T, Arena>] extends [never]
  ? never
  : Arena extends T // Needed when T is any
  ? Arena
  : Extract<T, Arena> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseArena;
}
export function isExactlyArena(x: any): x is Arena {
  return x?.['typeTag'] === 'Arena';
}

export function ensureKnownArena<T>(
  x: [Extract<T, Arena>] extends [never] ? never : T,
): Arena {
  assert(isKnownArena(x), () => mkUnexpectedTypeMsg([Arena], x));
  return x;
}
export function ensureMaybeKnownArena<T>(
  x: [Extract<T, Arena>] extends [never] ? never : T,
): Arena | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownArena(x);
}

export type Arena = KnownArena;
export interface ArenaParams {
  name: string /*  */;
  children: Array<ArenaChild> /*  */;
}

abstract class BaseArena {
  static isKnown(x: any): x is Arena {
    return isKnownArena(x);
  }
  static getType(): Arena {
    throw new Error();
  }
  static modelTypeName = 'Arena';

  constructor(args: ArenaParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.Arena(this, args);
    }
  }
  uid: number;
  name: string /*  */;
  children: Array<ArenaChild> /*  */;
}
class ClsArena extends BaseArena {
  get typeTag(): 'Arena' {
    return 'Arena';
  }
}
export const Arena = ClsArena;

type KnownFocusedFrameArena = ClsFocusedFrameArena;
export function isKnownFocusedFrameArena<T>(
  x: [Extract<T, FocusedFrameArena>] extends [never] ? never : T,
): x is [Extract<T, FocusedFrameArena>] extends [never]
  ? never
  : FocusedFrameArena extends T // Needed when T is any
  ? FocusedFrameArena
  : Extract<T, FocusedFrameArena> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseFocusedFrameArena;
}
export function isExactlyFocusedFrameArena(x: any): x is FocusedFrameArena {
  return x?.['typeTag'] === 'FocusedFrameArena';
}

export function ensureKnownFocusedFrameArena<T>(
  x: [Extract<T, FocusedFrameArena>] extends [never] ? never : T,
): FocusedFrameArena {
  assert(isKnownFocusedFrameArena(x), () =>
    mkUnexpectedTypeMsg([FocusedFrameArena], x),
  );
  return x;
}
export function ensureMaybeKnownFocusedFrameArena<T>(
  x: [Extract<T, FocusedFrameArena>] extends [never] ? never : T,
): FocusedFrameArena | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownFocusedFrameArena(x);
}

export type FocusedFrameArena = KnownFocusedFrameArena;
export interface FocusedFrameArenaParams {
  readonly frame: ArenaFrame /* Const */;
}

abstract class BaseFocusedFrameArena {
  static isKnown(x: any): x is FocusedFrameArena {
    return isKnownFocusedFrameArena(x);
  }
  static getType(): FocusedFrameArena {
    throw new Error();
  }
  static modelTypeName = 'FocusedFrameArena';

  constructor(args: FocusedFrameArenaParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.FocusedFrameArena(this, args);
    }
  }
  uid: number;
  readonly frame: ArenaFrame /* Const */;
}
class ClsFocusedFrameArena extends BaseFocusedFrameArena {
  get typeTag(): 'FocusedFrameArena' {
    return 'FocusedFrameArena';
  }
}
export const FocusedFrameArena = ClsFocusedFrameArena;

type KnownArenaChild = KnownArenaFrame;
export function isKnownArenaChild<T>(
  x: [Extract<T, ArenaChild>] extends [never] ? never : T,
): x is [Extract<T, ArenaChild>] extends [never]
  ? never
  : ArenaChild extends T // Needed when T is any
  ? ArenaChild
  : Extract<T, ArenaChild> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseArenaChild;
}

export function ensureKnownArenaChild<T>(
  x: [Extract<T, ArenaChild>] extends [never] ? never : T,
): ArenaChild {
  assert(isKnownArenaChild(x), () => mkUnexpectedTypeMsg([ArenaChild], x));
  return x;
}
export function ensureMaybeKnownArenaChild<T>(
  x: [Extract<T, ArenaChild>] extends [never] ? never : T,
): ArenaChild | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownArenaChild(x);
}

export type ArenaChild = KnownArenaChild;
export interface ArenaChildParams {
  name: string /*  */;
  top: number | null | undefined /*  */;
  left: number | null | undefined /*  */;
}

abstract class BaseArenaChild {
  static isKnown(x: any): x is ArenaChild {
    return isKnownArenaChild(x);
  }
  static getType(): ArenaChild {
    throw new Error();
  }
  static modelTypeName = 'ArenaChild';

  constructor(args: ArenaChildParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.ArenaChild(this, args);
    }
  }
  uid: number;
  name: string /*  */;
  top: number | null | undefined /*  */;
  left: number | null | undefined /*  */;
}

export const ArenaChild = BaseArenaChild;

type KnownArenaFrame = ClsArenaFrame;
export function isKnownArenaFrame<T>(
  x: [Extract<T, ArenaFrame>] extends [never] ? never : T,
): x is [Extract<T, ArenaFrame>] extends [never]
  ? never
  : ArenaFrame extends T // Needed when T is any
  ? ArenaFrame
  : Extract<T, ArenaFrame> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseArenaFrame;
}
export function isExactlyArenaFrame(x: any): x is ArenaFrame {
  return x?.['typeTag'] === 'ArenaFrame';
}

export function ensureKnownArenaFrame<T>(
  x: [Extract<T, ArenaFrame>] extends [never] ? never : T,
): ArenaFrame {
  assert(isKnownArenaFrame(x), () => mkUnexpectedTypeMsg([ArenaFrame], x));
  return x;
}
export function ensureMaybeKnownArenaFrame<T>(
  x: [Extract<T, ArenaFrame>] extends [never] ? never : T,
): ArenaFrame | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownArenaFrame(x);
}

export type ArenaFrame = KnownArenaFrame;
export interface ArenaFrameParams {
  readonly uuid: string /* Const */;
  width: number /*  */;
  height: number /*  */;
  viewportHeight: number | null | undefined /*  */;
  container: TplComponent /*  */;
  lang: string /*  */;
  pinnedVariants: {[key: string]: boolean} /*  */;
  targetVariants: Array<Variant> /* WeakRef */;
  pinnedGlobalVariants: {[key: string]: boolean} /*  */;
  targetGlobalVariants: Array<Variant> /* WeakRef */;
  viewMode: string /*  */;
  bgColor: string | null | undefined /*  */;
  name: string /*  */;
  top: number | null | undefined /*  */;
  left: number | null | undefined /*  */;
}

abstract class BaseArenaFrame extends BaseArenaChild {
  static isKnown(x: any): x is ArenaFrame {
    return isKnownArenaFrame(x);
  }
  static getType(): ArenaFrame {
    throw new Error();
  }
  static modelTypeName = 'ArenaFrame';

  constructor(args: ArenaFrameParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.ArenaFrame(this, args);
    }
  }
  uid: number;
  readonly uuid: string /* Const */;
  width: number /*  */;
  height: number /*  */;
  viewportHeight: number | null | undefined /*  */;
  container: TplComponent /*  */;
  lang: string /*  */;
  pinnedVariants: {[key: string]: boolean} /*  */;
  targetVariants: Array<Variant> /* WeakRef */;
  pinnedGlobalVariants: {[key: string]: boolean} /*  */;
  targetGlobalVariants: Array<Variant> /* WeakRef */;
  viewMode: string /*  */;
  bgColor: string | null | undefined /*  */;
  name: string /*  */;
  top: number | null | undefined /*  */;
  left: number | null | undefined /*  */;
}
class ClsArenaFrame extends BaseArenaFrame {
  get typeTag(): 'ArenaFrame' {
    return 'ArenaFrame';
  }
}
export const ArenaFrame = ClsArenaFrame;

type KnownOpaqueType = ClsOpaqueType;
export function isKnownOpaqueType<T>(
  x: [Extract<T, OpaqueType>] extends [never] ? never : T,
): x is [Extract<T, OpaqueType>] extends [never]
  ? never
  : OpaqueType extends T // Needed when T is any
  ? OpaqueType
  : Extract<T, OpaqueType> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseOpaqueType;
}
export function isExactlyOpaqueType(x: any): x is OpaqueType {
  return x?.['typeTag'] === 'OpaqueType';
}

export function ensureKnownOpaqueType<T>(
  x: [Extract<T, OpaqueType>] extends [never] ? never : T,
): OpaqueType {
  assert(isKnownOpaqueType(x), () => mkUnexpectedTypeMsg([OpaqueType], x));
  return x;
}
export function ensureMaybeKnownOpaqueType<T>(
  x: [Extract<T, OpaqueType>] extends [never] ? never : T,
): OpaqueType | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownOpaqueType(x);
}

export type OpaqueType = KnownOpaqueType;
export interface OpaqueTypeParams {
  params: Array<Type> /*  */;
  name: string /*  */;
}

abstract class BaseOpaqueType extends BaseUserType {
  static isKnown(x: any): x is OpaqueType {
    return isKnownOpaqueType(x);
  }
  static getType(): OpaqueType {
    throw new Error();
  }
  static modelTypeName = 'OpaqueType';

  constructor(args: OpaqueTypeParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.OpaqueType(this, args);
    }
  }
  uid: number;
  params: Array<Type> /*  */;
  name: string /*  */;
}
class ClsOpaqueType extends BaseOpaqueType {
  get typeTag(): 'OpaqueType' {
    return 'OpaqueType';
  }
}
export const OpaqueType = ClsOpaqueType;

type KnownRenderFuncType = ClsRenderFuncType;
export function isKnownRenderFuncType<T>(
  x: [Extract<T, RenderFuncType>] extends [never] ? never : T,
): x is [Extract<T, RenderFuncType>] extends [never]
  ? never
  : RenderFuncType extends T // Needed when T is any
  ? RenderFuncType
  : Extract<T, RenderFuncType> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseRenderFuncType;
}
export function isExactlyRenderFuncType(x: any): x is RenderFuncType {
  return x?.['typeTag'] === 'RenderFuncType';
}

export function ensureKnownRenderFuncType<T>(
  x: [Extract<T, RenderFuncType>] extends [never] ? never : T,
): RenderFuncType {
  assert(isKnownRenderFuncType(x), () =>
    mkUnexpectedTypeMsg([RenderFuncType], x),
  );
  return x;
}
export function ensureMaybeKnownRenderFuncType<T>(
  x: [Extract<T, RenderFuncType>] extends [never] ? never : T,
): RenderFuncType | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownRenderFuncType(x);
}

export type RenderFuncType = KnownRenderFuncType;
export interface RenderFuncTypeParams {
  params: Array<ArgType> /*  */;
  allowed: Array<ComponentInstance> /*  */;
  name: string /*  */;
}

abstract class BaseRenderFuncType extends BaseUserType {
  static isKnown(x: any): x is RenderFuncType {
    return isKnownRenderFuncType(x);
  }
  static getType(): RenderFuncType {
    throw new Error();
  }
  static modelTypeName = 'RenderFuncType';

  constructor(args: RenderFuncTypeParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.RenderFuncType(this, args);
    }
  }
  uid: number;
  params: Array<ArgType> /*  */;
  allowed: Array<ComponentInstance> /*  */;
  name: string /*  */;
}
class ClsRenderFuncType extends BaseRenderFuncType {
  get typeTag(): 'RenderFuncType' {
    return 'RenderFuncType';
  }
}
export const RenderFuncType = ClsRenderFuncType;

type KnownStyleNode = KnownRuleSet | KnownRule;
export function isKnownStyleNode<T>(
  x: [Extract<T, StyleNode>] extends [never] ? never : T,
): x is [Extract<T, StyleNode>] extends [never]
  ? never
  : StyleNode extends T // Needed when T is any
  ? StyleNode
  : Extract<T, StyleNode> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseStyleNode;
}

export function ensureKnownStyleNode<T>(
  x: [Extract<T, StyleNode>] extends [never] ? never : T,
): StyleNode {
  assert(isKnownStyleNode(x), () => mkUnexpectedTypeMsg([StyleNode], x));
  return x;
}
export function ensureMaybeKnownStyleNode<T>(
  x: [Extract<T, StyleNode>] extends [never] ? never : T,
): StyleNode | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownStyleNode(x);
}

export type StyleNode = KnownStyleNode;
export interface StyleNodeParams {}

abstract class BaseStyleNode {
  static isKnown(x: any): x is StyleNode {
    return isKnownStyleNode(x);
  }
  static getType(): StyleNode {
    throw new Error();
  }
  static modelTypeName = 'StyleNode';

  constructor(args: StyleNodeParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.StyleNode(this, args);
    }
  }
  uid: number;
}

export const StyleNode = BaseStyleNode;

type KnownRuleSet = ClsRuleSet;
export function isKnownRuleSet<T>(
  x: [Extract<T, RuleSet>] extends [never] ? never : T,
): x is [Extract<T, RuleSet>] extends [never]
  ? never
  : RuleSet extends T // Needed when T is any
  ? RuleSet
  : Extract<T, RuleSet> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseRuleSet;
}
export function isExactlyRuleSet(x: any): x is RuleSet {
  return x?.['typeTag'] === 'RuleSet';
}

export function ensureKnownRuleSet<T>(
  x: [Extract<T, RuleSet>] extends [never] ? never : T,
): RuleSet {
  assert(isKnownRuleSet(x), () => mkUnexpectedTypeMsg([RuleSet], x));
  return x;
}
export function ensureMaybeKnownRuleSet<T>(
  x: [Extract<T, RuleSet>] extends [never] ? never : T,
): RuleSet | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownRuleSet(x);
}

export type RuleSet = KnownRuleSet;
export interface RuleSetParams {
  children: Array<Rule> /*  */;
  mixins: Array<Mixin> /* WeakRef */;
}

abstract class BaseRuleSet extends BaseStyleNode {
  static isKnown(x: any): x is RuleSet {
    return isKnownRuleSet(x);
  }
  static getType(): RuleSet {
    throw new Error();
  }
  static modelTypeName = 'RuleSet';

  constructor(args: RuleSetParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.RuleSet(this, args);
    }
  }
  uid: number;
  children: Array<Rule> /*  */;
  mixins: Array<Mixin> /* WeakRef */;
}
class ClsRuleSet extends BaseRuleSet {
  get typeTag(): 'RuleSet' {
    return 'RuleSet';
  }
}
export const RuleSet = ClsRuleSet;

type KnownRule = ClsRule;
export function isKnownRule<T>(
  x: [Extract<T, Rule>] extends [never] ? never : T,
): x is [Extract<T, Rule>] extends [never]
  ? never
  : Rule extends T // Needed when T is any
  ? Rule
  : Extract<T, Rule> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseRule;
}
export function isExactlyRule(x: any): x is Rule {
  return x?.['typeTag'] === 'Rule';
}

export function ensureKnownRule<T>(
  x: [Extract<T, Rule>] extends [never] ? never : T,
): Rule {
  assert(isKnownRule(x), () => mkUnexpectedTypeMsg([Rule], x));
  return x;
}
export function ensureMaybeKnownRule<T>(
  x: [Extract<T, Rule>] extends [never] ? never : T,
): Rule | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownRule(x);
}

export type Rule = KnownRule;
export interface RuleParams {
  readonly name: string /* Const */;
  values: Array<string> /*  */;
}

abstract class BaseRule extends BaseStyleNode {
  static isKnown(x: any): x is Rule {
    return isKnownRule(x);
  }
  static getType(): Rule {
    throw new Error();
  }
  static modelTypeName = 'Rule';

  constructor(args: RuleParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.Rule(this, args);
    }
  }
  uid: number;
  readonly name: string /* Const */;
  values: Array<string> /*  */;
}
class ClsRule extends BaseRule {
  get typeTag(): 'Rule' {
    return 'Rule';
  }
}
export const Rule = ClsRule;

type KnownVariantedRuleSet = ClsVariantedRuleSet;
export function isKnownVariantedRuleSet<T>(
  x: [Extract<T, VariantedRuleSet>] extends [never] ? never : T,
): x is [Extract<T, VariantedRuleSet>] extends [never]
  ? never
  : VariantedRuleSet extends T // Needed when T is any
  ? VariantedRuleSet
  : Extract<T, VariantedRuleSet> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseVariantedRuleSet;
}
export function isExactlyVariantedRuleSet(x: any): x is VariantedRuleSet {
  return x?.['typeTag'] === 'VariantedRuleSet';
}

export function ensureKnownVariantedRuleSet<T>(
  x: [Extract<T, VariantedRuleSet>] extends [never] ? never : T,
): VariantedRuleSet {
  assert(isKnownVariantedRuleSet(x), () =>
    mkUnexpectedTypeMsg([VariantedRuleSet], x),
  );
  return x;
}
export function ensureMaybeKnownVariantedRuleSet<T>(
  x: [Extract<T, VariantedRuleSet>] extends [never] ? never : T,
): VariantedRuleSet | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownVariantedRuleSet(x);
}

export type VariantedRuleSet = KnownVariantedRuleSet;
export interface VariantedRuleSetParams {
  readonly variants: Array<Variant> /* Const,WeakRef */;
  rs: RuleSet /*  */;
}

abstract class BaseVariantedRuleSet {
  static isKnown(x: any): x is VariantedRuleSet {
    return isKnownVariantedRuleSet(x);
  }
  static getType(): VariantedRuleSet {
    throw new Error();
  }
  static modelTypeName = 'VariantedRuleSet';

  constructor(args: VariantedRuleSetParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.VariantedRuleSet(this, args);
    }
  }
  uid: number;
  readonly variants: Array<Variant> /* Const,WeakRef */;
  rs: RuleSet /*  */;
}
class ClsVariantedRuleSet extends BaseVariantedRuleSet {
  get typeTag(): 'VariantedRuleSet' {
    return 'VariantedRuleSet';
  }
}
export const VariantedRuleSet = ClsVariantedRuleSet;

type KnownMixin = ClsMixin;
export function isKnownMixin<T>(
  x: [Extract<T, Mixin>] extends [never] ? never : T,
): x is [Extract<T, Mixin>] extends [never]
  ? never
  : Mixin extends T // Needed when T is any
  ? Mixin
  : Extract<T, Mixin> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseMixin;
}
export function isExactlyMixin(x: any): x is Mixin {
  return x?.['typeTag'] === 'Mixin';
}

export function ensureKnownMixin<T>(
  x: [Extract<T, Mixin>] extends [never] ? never : T,
): Mixin {
  assert(isKnownMixin(x), () => mkUnexpectedTypeMsg([Mixin], x));
  return x;
}
export function ensureMaybeKnownMixin<T>(
  x: [Extract<T, Mixin>] extends [never] ? never : T,
): Mixin | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownMixin(x);
}

export type Mixin = KnownMixin;
export interface MixinParams {
  name: string /*  */;
  rs: RuleSet /*  */;
  preview: string | null | undefined /*  */;
  readonly uuid: string /* Const */;
  readonly forTheme: boolean /* Const */;
  variantedRs: Array<VariantedRuleSet> /*  */;
}

abstract class BaseMixin {
  static isKnown(x: any): x is Mixin {
    return isKnownMixin(x);
  }
  static getType(): Mixin {
    throw new Error();
  }
  static modelTypeName = 'Mixin';

  constructor(args: MixinParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.Mixin(this, args);
    }
  }
  uid: number;
  name: string /*  */;
  rs: RuleSet /*  */;
  preview: string | null | undefined /*  */;
  readonly uuid: string /* Const */;
  readonly forTheme: boolean /* Const */;
  variantedRs: Array<VariantedRuleSet> /*  */;
}
class ClsMixin extends BaseMixin {
  get typeTag(): 'Mixin' {
    return 'Mixin';
  }
}
export const Mixin = ClsMixin;

type KnownTheme = ClsTheme;
export function isKnownTheme<T>(
  x: [Extract<T, Theme>] extends [never] ? never : T,
): x is [Extract<T, Theme>] extends [never]
  ? never
  : Theme extends T // Needed when T is any
  ? Theme
  : Extract<T, Theme> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseTheme;
}
export function isExactlyTheme(x: any): x is Theme {
  return x?.['typeTag'] === 'Theme';
}

export function ensureKnownTheme<T>(
  x: [Extract<T, Theme>] extends [never] ? never : T,
): Theme {
  assert(isKnownTheme(x), () => mkUnexpectedTypeMsg([Theme], x));
  return x;
}
export function ensureMaybeKnownTheme<T>(
  x: [Extract<T, Theme>] extends [never] ? never : T,
): Theme | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownTheme(x);
}

export type Theme = KnownTheme;
export interface ThemeParams {
  defaultStyle: Mixin /*  */;
  styles: Array<ThemeStyle> /*  */;
  layout: ThemeLayoutSettings | null | undefined /*  */;
  readonly active: boolean /* Const */;
}

abstract class BaseTheme {
  static isKnown(x: any): x is Theme {
    return isKnownTheme(x);
  }
  static getType(): Theme {
    throw new Error();
  }
  static modelTypeName = 'Theme';

  constructor(args: ThemeParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.Theme(this, args);
    }
  }
  uid: number;
  defaultStyle: Mixin /*  */;
  styles: Array<ThemeStyle> /*  */;
  layout: ThemeLayoutSettings | null | undefined /*  */;
  readonly active: boolean /* Const */;
}
class ClsTheme extends BaseTheme {
  get typeTag(): 'Theme' {
    return 'Theme';
  }
}
export const Theme = ClsTheme;

type KnownThemeStyle = ClsThemeStyle;
export function isKnownThemeStyle<T>(
  x: [Extract<T, ThemeStyle>] extends [never] ? never : T,
): x is [Extract<T, ThemeStyle>] extends [never]
  ? never
  : ThemeStyle extends T // Needed when T is any
  ? ThemeStyle
  : Extract<T, ThemeStyle> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseThemeStyle;
}
export function isExactlyThemeStyle(x: any): x is ThemeStyle {
  return x?.['typeTag'] === 'ThemeStyle';
}

export function ensureKnownThemeStyle<T>(
  x: [Extract<T, ThemeStyle>] extends [never] ? never : T,
): ThemeStyle {
  assert(isKnownThemeStyle(x), () => mkUnexpectedTypeMsg([ThemeStyle], x));
  return x;
}
export function ensureMaybeKnownThemeStyle<T>(
  x: [Extract<T, ThemeStyle>] extends [never] ? never : T,
): ThemeStyle | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownThemeStyle(x);
}

export type ThemeStyle = KnownThemeStyle;
export interface ThemeStyleParams {
  readonly selector: string /* Const */;
  style: Mixin /*  */;
}

abstract class BaseThemeStyle {
  static isKnown(x: any): x is ThemeStyle {
    return isKnownThemeStyle(x);
  }
  static getType(): ThemeStyle {
    throw new Error();
  }
  static modelTypeName = 'ThemeStyle';

  constructor(args: ThemeStyleParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.ThemeStyle(this, args);
    }
  }
  uid: number;
  readonly selector: string /* Const */;
  style: Mixin /*  */;
}
class ClsThemeStyle extends BaseThemeStyle {
  get typeTag(): 'ThemeStyle' {
    return 'ThemeStyle';
  }
}
export const ThemeStyle = ClsThemeStyle;

type KnownThemeLayoutSettings = ClsThemeLayoutSettings;
export function isKnownThemeLayoutSettings<T>(
  x: [Extract<T, ThemeLayoutSettings>] extends [never] ? never : T,
): x is [Extract<T, ThemeLayoutSettings>] extends [never]
  ? never
  : ThemeLayoutSettings extends T // Needed when T is any
  ? ThemeLayoutSettings
  : Extract<T, ThemeLayoutSettings> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseThemeLayoutSettings;
}
export function isExactlyThemeLayoutSettings(x: any): x is ThemeLayoutSettings {
  return x?.['typeTag'] === 'ThemeLayoutSettings';
}

export function ensureKnownThemeLayoutSettings<T>(
  x: [Extract<T, ThemeLayoutSettings>] extends [never] ? never : T,
): ThemeLayoutSettings {
  assert(isKnownThemeLayoutSettings(x), () =>
    mkUnexpectedTypeMsg([ThemeLayoutSettings], x),
  );
  return x;
}
export function ensureMaybeKnownThemeLayoutSettings<T>(
  x: [Extract<T, ThemeLayoutSettings>] extends [never] ? never : T,
): ThemeLayoutSettings | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownThemeLayoutSettings(x);
}

export type ThemeLayoutSettings = KnownThemeLayoutSettings;
export interface ThemeLayoutSettingsParams {
  rs: RuleSet /*  */;
}

abstract class BaseThemeLayoutSettings {
  static isKnown(x: any): x is ThemeLayoutSettings {
    return isKnownThemeLayoutSettings(x);
  }
  static getType(): ThemeLayoutSettings {
    throw new Error();
  }
  static modelTypeName = 'ThemeLayoutSettings';

  constructor(args: ThemeLayoutSettingsParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.ThemeLayoutSettings(this, args);
    }
  }
  uid: number;
  rs: RuleSet /*  */;
}
class ClsThemeLayoutSettings extends BaseThemeLayoutSettings {
  get typeTag(): 'ThemeLayoutSettings' {
    return 'ThemeLayoutSettings';
  }
}
export const ThemeLayoutSettings = ClsThemeLayoutSettings;

type KnownProjectDependency = ClsProjectDependency;
export function isKnownProjectDependency<T>(
  x: [Extract<T, ProjectDependency>] extends [never] ? never : T,
): x is [Extract<T, ProjectDependency>] extends [never]
  ? never
  : ProjectDependency extends T // Needed when T is any
  ? ProjectDependency
  : Extract<T, ProjectDependency> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseProjectDependency;
}
export function isExactlyProjectDependency(x: any): x is ProjectDependency {
  return x?.['typeTag'] === 'ProjectDependency';
}

export function ensureKnownProjectDependency<T>(
  x: [Extract<T, ProjectDependency>] extends [never] ? never : T,
): ProjectDependency {
  assert(isKnownProjectDependency(x), () =>
    mkUnexpectedTypeMsg([ProjectDependency], x),
  );
  return x;
}
export function ensureMaybeKnownProjectDependency<T>(
  x: [Extract<T, ProjectDependency>] extends [never] ? never : T,
): ProjectDependency | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownProjectDependency(x);
}

export type ProjectDependency = KnownProjectDependency;
export interface ProjectDependencyParams {
  readonly uuid: string /* Const */;
  pkgId: string /*  */;
  projectId: string /*  */;
  version: string /*  */;
  name: string /*  */;
  site: Site /*  */;
}

abstract class BaseProjectDependency {
  static isKnown(x: any): x is ProjectDependency {
    return isKnownProjectDependency(x);
  }
  static getType(): ProjectDependency {
    throw new Error();
  }
  static modelTypeName = 'ProjectDependency';

  constructor(args: ProjectDependencyParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.ProjectDependency(this, args);
    }
  }
  uid: number;
  readonly uuid: string /* Const */;
  pkgId: string /*  */;
  projectId: string /*  */;
  version: string /*  */;
  name: string /*  */;
  site: Site /*  */;
}
class ClsProjectDependency extends BaseProjectDependency {
  get typeTag(): 'ProjectDependency' {
    return 'ProjectDependency';
  }
}
export const ProjectDependency = ClsProjectDependency;

type KnownImageAsset = ClsImageAsset;
export function isKnownImageAsset<T>(
  x: [Extract<T, ImageAsset>] extends [never] ? never : T,
): x is [Extract<T, ImageAsset>] extends [never]
  ? never
  : ImageAsset extends T // Needed when T is any
  ? ImageAsset
  : Extract<T, ImageAsset> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseImageAsset;
}
export function isExactlyImageAsset(x: any): x is ImageAsset {
  return x?.['typeTag'] === 'ImageAsset';
}

export function ensureKnownImageAsset<T>(
  x: [Extract<T, ImageAsset>] extends [never] ? never : T,
): ImageAsset {
  assert(isKnownImageAsset(x), () => mkUnexpectedTypeMsg([ImageAsset], x));
  return x;
}
export function ensureMaybeKnownImageAsset<T>(
  x: [Extract<T, ImageAsset>] extends [never] ? never : T,
): ImageAsset | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownImageAsset(x);
}

export type ImageAsset = KnownImageAsset;
export interface ImageAssetParams {
  readonly uuid: string /* Const */;
  name: string /*  */;
  readonly type: string /* Const */;
  dataUri: string | null | undefined /*  */;
  width: number | null | undefined /*  */;
  height: number | null | undefined /*  */;
  aspectRatio: number | null | undefined /*  */;
}

abstract class BaseImageAsset {
  static isKnown(x: any): x is ImageAsset {
    return isKnownImageAsset(x);
  }
  static getType(): ImageAsset {
    throw new Error();
  }
  static modelTypeName = 'ImageAsset';

  constructor(args: ImageAssetParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.ImageAsset(this, args);
    }
  }
  uid: number;
  readonly uuid: string /* Const */;
  name: string /*  */;
  readonly type: string /* Const */;
  dataUri: string | null | undefined /*  */;
  width: number | null | undefined /*  */;
  height: number | null | undefined /*  */;
  aspectRatio: number | null | undefined /*  */;
}
class ClsImageAsset extends BaseImageAsset {
  get typeTag(): 'ImageAsset' {
    return 'ImageAsset';
  }
}
export const ImageAsset = ClsImageAsset;

type KnownTplNode = KnownTplTag | KnownTplComponent | KnownTplSlot;
export function isKnownTplNode<T>(
  x: [Extract<T, TplNode>] extends [never] ? never : T,
): x is [Extract<T, TplNode>] extends [never]
  ? never
  : TplNode extends T // Needed when T is any
  ? TplNode
  : Extract<T, TplNode> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseTplNode;
}

export function ensureKnownTplNode<T>(
  x: [Extract<T, TplNode>] extends [never] ? never : T,
): TplNode {
  assert(isKnownTplNode(x), () => mkUnexpectedTypeMsg([TplNode], x));
  return x;
}
export function ensureMaybeKnownTplNode<T>(
  x: [Extract<T, TplNode>] extends [never] ? never : T,
): TplNode | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownTplNode(x);
}

export type TplNode = KnownTplNode;
export interface TplNodeParams {
  readonly uuid: string /* Const */;
  parent: TplNode | null | undefined /* WeakRef */;
  locked: boolean | null | undefined /*  */;
  vsettings: Array<VariantSetting> /*  */;
}

abstract class BaseTplNode {
  static isKnown(x: any): x is TplNode {
    return isKnownTplNode(x);
  }
  static getType(): TplNode {
    throw new Error();
  }
  static modelTypeName = 'TplNode';

  constructor(args: TplNodeParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.TplNode(this, args);
    }
  }
  uid: number;
  readonly uuid: string /* Const */;
  parent: TplNode | null | undefined /* WeakRef */;
  locked: boolean | null | undefined /*  */;
  vsettings: Array<VariantSetting> /*  */;
}

export const TplNode = BaseTplNode;

type KnownTplTag = ClsTplTag;
export function isKnownTplTag<T>(
  x: [Extract<T, TplTag>] extends [never] ? never : T,
): x is [Extract<T, TplTag>] extends [never]
  ? never
  : TplTag extends T // Needed when T is any
  ? TplTag
  : Extract<T, TplTag> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseTplTag;
}
export function isExactlyTplTag(x: any): x is TplTag {
  return x?.['typeTag'] === 'TplTag';
}

export function ensureKnownTplTag<T>(
  x: [Extract<T, TplTag>] extends [never] ? never : T,
): TplTag {
  assert(isKnownTplTag(x), () => mkUnexpectedTypeMsg([TplTag], x));
  return x;
}
export function ensureMaybeKnownTplTag<T>(
  x: [Extract<T, TplTag>] extends [never] ? never : T,
): TplTag | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownTplTag(x);
}

export type TplTag = KnownTplTag;
export interface TplTagParams {
  tag: string /*  */;
  name: string | null | undefined /*  */;
  children: Array<TplNode> /*  */;
  type: string /*  */;
  codeGenType: string | null | undefined /*  */;
  columnsSetting: ColumnsSetting | null | undefined /*  */;
  readonly uuid: string /* Const */;
  parent: TplNode | null | undefined /* WeakRef */;
  locked: boolean | null | undefined /*  */;
  vsettings: Array<VariantSetting> /*  */;
}

abstract class BaseTplTag extends BaseTplNode {
  static isKnown(x: any): x is TplTag {
    return isKnownTplTag(x);
  }
  static getType(): TplTag {
    throw new Error();
  }
  static modelTypeName = 'TplTag';

  constructor(args: TplTagParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.TplTag(this, args);
    }
  }
  uid: number;
  tag: string /*  */;
  name: string | null | undefined /*  */;
  children: Array<TplNode> /*  */;
  type: string /*  */;
  codeGenType: string | null | undefined /*  */;
  columnsSetting: ColumnsSetting | null | undefined /*  */;
  readonly uuid: string /* Const */;
  parent: TplNode | null | undefined /* WeakRef */;
  locked: boolean | null | undefined /*  */;
  vsettings: Array<VariantSetting> /*  */;
}
class ClsTplTag extends BaseTplTag {
  get typeTag(): 'TplTag' {
    return 'TplTag';
  }
}
export const TplTag = ClsTplTag;

type KnownTplComponent = ClsTplComponent;
export function isKnownTplComponent<T>(
  x: [Extract<T, TplComponent>] extends [never] ? never : T,
): x is [Extract<T, TplComponent>] extends [never]
  ? never
  : TplComponent extends T // Needed when T is any
  ? TplComponent
  : Extract<T, TplComponent> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseTplComponent;
}
export function isExactlyTplComponent(x: any): x is TplComponent {
  return x?.['typeTag'] === 'TplComponent';
}

export function ensureKnownTplComponent<T>(
  x: [Extract<T, TplComponent>] extends [never] ? never : T,
): TplComponent {
  assert(isKnownTplComponent(x), () => mkUnexpectedTypeMsg([TplComponent], x));
  return x;
}
export function ensureMaybeKnownTplComponent<T>(
  x: [Extract<T, TplComponent>] extends [never] ? never : T,
): TplComponent | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownTplComponent(x);
}

export type TplComponent = KnownTplComponent;
export interface TplComponentParams {
  name: string | null | undefined /*  */;
  component: Component /* WeakRef */;
  readonly uuid: string /* Const */;
  parent: TplNode | null | undefined /* WeakRef */;
  locked: boolean | null | undefined /*  */;
  vsettings: Array<VariantSetting> /*  */;
}

abstract class BaseTplComponent extends BaseTplNode {
  static isKnown(x: any): x is TplComponent {
    return isKnownTplComponent(x);
  }
  static getType(): TplComponent {
    throw new Error();
  }
  static modelTypeName = 'TplComponent';

  constructor(args: TplComponentParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.TplComponent(this, args);
    }
  }
  uid: number;
  name: string | null | undefined /*  */;
  component: Component /* WeakRef */;
  readonly uuid: string /* Const */;
  parent: TplNode | null | undefined /* WeakRef */;
  locked: boolean | null | undefined /*  */;
  vsettings: Array<VariantSetting> /*  */;
}
class ClsTplComponent extends BaseTplComponent {
  get typeTag(): 'TplComponent' {
    return 'TplComponent';
  }
}
export const TplComponent = ClsTplComponent;

type KnownTplSlot = ClsTplSlot;
export function isKnownTplSlot<T>(
  x: [Extract<T, TplSlot>] extends [never] ? never : T,
): x is [Extract<T, TplSlot>] extends [never]
  ? never
  : TplSlot extends T // Needed when T is any
  ? TplSlot
  : Extract<T, TplSlot> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseTplSlot;
}
export function isExactlyTplSlot(x: any): x is TplSlot {
  return x?.['typeTag'] === 'TplSlot';
}

export function ensureKnownTplSlot<T>(
  x: [Extract<T, TplSlot>] extends [never] ? never : T,
): TplSlot {
  assert(isKnownTplSlot(x), () => mkUnexpectedTypeMsg([TplSlot], x));
  return x;
}
export function ensureMaybeKnownTplSlot<T>(
  x: [Extract<T, TplSlot>] extends [never] ? never : T,
): TplSlot | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownTplSlot(x);
}

export type TplSlot = KnownTplSlot;
export interface TplSlotParams {
  param: Param /* WeakRef */;
  defaultContents: Array<TplNode> /*  */;
  readonly uuid: string /* Const */;
  parent: TplNode | null | undefined /* WeakRef */;
  locked: boolean | null | undefined /*  */;
  vsettings: Array<VariantSetting> /*  */;
}

abstract class BaseTplSlot extends BaseTplNode {
  static isKnown(x: any): x is TplSlot {
    return isKnownTplSlot(x);
  }
  static getType(): TplSlot {
    throw new Error();
  }
  static modelTypeName = 'TplSlot';

  constructor(args: TplSlotParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.TplSlot(this, args);
    }
  }
  uid: number;
  param: Param /* WeakRef */;
  defaultContents: Array<TplNode> /*  */;
  readonly uuid: string /* Const */;
  parent: TplNode | null | undefined /* WeakRef */;
  locked: boolean | null | undefined /*  */;
  vsettings: Array<VariantSetting> /*  */;
}
class ClsTplSlot extends BaseTplSlot {
  get typeTag(): 'TplSlot' {
    return 'TplSlot';
  }
}
export const TplSlot = ClsTplSlot;

type KnownColumnsSetting = ClsColumnsSetting;
export function isKnownColumnsSetting<T>(
  x: [Extract<T, ColumnsSetting>] extends [never] ? never : T,
): x is [Extract<T, ColumnsSetting>] extends [never]
  ? never
  : ColumnsSetting extends T // Needed when T is any
  ? ColumnsSetting
  : Extract<T, ColumnsSetting> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseColumnsSetting;
}
export function isExactlyColumnsSetting(x: any): x is ColumnsSetting {
  return x?.['typeTag'] === 'ColumnsSetting';
}

export function ensureKnownColumnsSetting<T>(
  x: [Extract<T, ColumnsSetting>] extends [never] ? never : T,
): ColumnsSetting {
  assert(isKnownColumnsSetting(x), () =>
    mkUnexpectedTypeMsg([ColumnsSetting], x),
  );
  return x;
}
export function ensureMaybeKnownColumnsSetting<T>(
  x: [Extract<T, ColumnsSetting>] extends [never] ? never : T,
): ColumnsSetting | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownColumnsSetting(x);
}

export type ColumnsSetting = KnownColumnsSetting;
export interface ColumnsSettingParams {
  screenBreakpoint: Variant | null | undefined /* WeakRef */;
}

abstract class BaseColumnsSetting {
  static isKnown(x: any): x is ColumnsSetting {
    return isKnownColumnsSetting(x);
  }
  static getType(): ColumnsSetting {
    throw new Error();
  }
  static modelTypeName = 'ColumnsSetting';

  constructor(args: ColumnsSettingParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.ColumnsSetting(this, args);
    }
  }
  uid: number;
  screenBreakpoint: Variant | null | undefined /* WeakRef */;
}
class ClsColumnsSetting extends BaseColumnsSetting {
  get typeTag(): 'ColumnsSetting' {
    return 'ColumnsSetting';
  }
}
export const ColumnsSetting = ClsColumnsSetting;

type KnownPageMeta = ClsPageMeta;
export function isKnownPageMeta<T>(
  x: [Extract<T, PageMeta>] extends [never] ? never : T,
): x is [Extract<T, PageMeta>] extends [never]
  ? never
  : PageMeta extends T // Needed when T is any
  ? PageMeta
  : Extract<T, PageMeta> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BasePageMeta;
}
export function isExactlyPageMeta(x: any): x is PageMeta {
  return x?.['typeTag'] === 'PageMeta';
}

export function ensureKnownPageMeta<T>(
  x: [Extract<T, PageMeta>] extends [never] ? never : T,
): PageMeta {
  assert(isKnownPageMeta(x), () => mkUnexpectedTypeMsg([PageMeta], x));
  return x;
}
export function ensureMaybeKnownPageMeta<T>(
  x: [Extract<T, PageMeta>] extends [never] ? never : T,
): PageMeta | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownPageMeta(x);
}

export type PageMeta = KnownPageMeta;
export interface PageMetaParams {
  path: string /*  */;
  params: {[key: string]: string} /*  */;
  query: {[key: string]: string} /*  */;
  title: string | null | undefined /*  */;
  description: string /*  */;
  canonical: string | null | undefined /*  */;
  roleId: string | null | undefined /*  */;
  openGraphImage:
    | ImageAsset
    | null
    | undefined
    | string
    | null
    | undefined /* WeakRef */;
}

abstract class BasePageMeta {
  static isKnown(x: any): x is PageMeta {
    return isKnownPageMeta(x);
  }
  static getType(): PageMeta {
    throw new Error();
  }
  static modelTypeName = 'PageMeta';

  constructor(args: PageMetaParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.PageMeta(this, args);
    }
  }
  uid: number;
  path: string /*  */;
  params: {[key: string]: string} /*  */;
  query: {[key: string]: string} /*  */;
  title: string | null | undefined /*  */;
  description: string /*  */;
  canonical: string | null | undefined /*  */;
  roleId: string | null | undefined /*  */;
  openGraphImage:
    | ImageAsset
    | null
    | undefined
    | string
    | null
    | undefined /* WeakRef */;
}
class ClsPageMeta extends BasePageMeta {
  get typeTag(): 'PageMeta' {
    return 'PageMeta';
  }
}
export const PageMeta = ClsPageMeta;

type KnownComponentDataQuery = ClsComponentDataQuery;
export function isKnownComponentDataQuery<T>(
  x: [Extract<T, ComponentDataQuery>] extends [never] ? never : T,
): x is [Extract<T, ComponentDataQuery>] extends [never]
  ? never
  : ComponentDataQuery extends T // Needed when T is any
  ? ComponentDataQuery
  : Extract<T, ComponentDataQuery> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseComponentDataQuery;
}
export function isExactlyComponentDataQuery(x: any): x is ComponentDataQuery {
  return x?.['typeTag'] === 'ComponentDataQuery';
}

export function ensureKnownComponentDataQuery<T>(
  x: [Extract<T, ComponentDataQuery>] extends [never] ? never : T,
): ComponentDataQuery {
  assert(isKnownComponentDataQuery(x), () =>
    mkUnexpectedTypeMsg([ComponentDataQuery], x),
  );
  return x;
}
export function ensureMaybeKnownComponentDataQuery<T>(
  x: [Extract<T, ComponentDataQuery>] extends [never] ? never : T,
): ComponentDataQuery | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownComponentDataQuery(x);
}

export type ComponentDataQuery = KnownComponentDataQuery;
export interface ComponentDataQueryParams {
  readonly uuid: string /* Const */;
  name: string /*  */;
  op: DataSourceOpExpr | null | undefined /*  */;
}

abstract class BaseComponentDataQuery {
  static isKnown(x: any): x is ComponentDataQuery {
    return isKnownComponentDataQuery(x);
  }
  static getType(): ComponentDataQuery {
    throw new Error();
  }
  static modelTypeName = 'ComponentDataQuery';

  constructor(args: ComponentDataQueryParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.ComponentDataQuery(this, args);
    }
  }
  uid: number;
  readonly uuid: string /* Const */;
  name: string /*  */;
  op: DataSourceOpExpr | null | undefined /*  */;
}
class ClsComponentDataQuery extends BaseComponentDataQuery {
  get typeTag(): 'ComponentDataQuery' {
    return 'ComponentDataQuery';
  }
}
export const ComponentDataQuery = ClsComponentDataQuery;

type KnownCodeComponentHelper = ClsCodeComponentHelper;
export function isKnownCodeComponentHelper<T>(
  x: [Extract<T, CodeComponentHelper>] extends [never] ? never : T,
): x is [Extract<T, CodeComponentHelper>] extends [never]
  ? never
  : CodeComponentHelper extends T // Needed when T is any
  ? CodeComponentHelper
  : Extract<T, CodeComponentHelper> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseCodeComponentHelper;
}
export function isExactlyCodeComponentHelper(x: any): x is CodeComponentHelper {
  return x?.['typeTag'] === 'CodeComponentHelper';
}

export function ensureKnownCodeComponentHelper<T>(
  x: [Extract<T, CodeComponentHelper>] extends [never] ? never : T,
): CodeComponentHelper {
  assert(isKnownCodeComponentHelper(x), () =>
    mkUnexpectedTypeMsg([CodeComponentHelper], x),
  );
  return x;
}
export function ensureMaybeKnownCodeComponentHelper<T>(
  x: [Extract<T, CodeComponentHelper>] extends [never] ? never : T,
): CodeComponentHelper | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownCodeComponentHelper(x);
}

export type CodeComponentHelper = KnownCodeComponentHelper;
export interface CodeComponentHelperParams {
  importPath: string /*  */;
  importName: string /*  */;
  defaultExport: boolean /*  */;
}

abstract class BaseCodeComponentHelper {
  static isKnown(x: any): x is CodeComponentHelper {
    return isKnownCodeComponentHelper(x);
  }
  static getType(): CodeComponentHelper {
    throw new Error();
  }
  static modelTypeName = 'CodeComponentHelper';

  constructor(args: CodeComponentHelperParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.CodeComponentHelper(this, args);
    }
  }
  uid: number;
  importPath: string /*  */;
  importName: string /*  */;
  defaultExport: boolean /*  */;
}
class ClsCodeComponentHelper extends BaseCodeComponentHelper {
  get typeTag(): 'CodeComponentHelper' {
    return 'CodeComponentHelper';
  }
}
export const CodeComponentHelper = ClsCodeComponentHelper;

type KnownCodeComponentMeta = ClsCodeComponentMeta;
export function isKnownCodeComponentMeta<T>(
  x: [Extract<T, CodeComponentMeta>] extends [never] ? never : T,
): x is [Extract<T, CodeComponentMeta>] extends [never]
  ? never
  : CodeComponentMeta extends T // Needed when T is any
  ? CodeComponentMeta
  : Extract<T, CodeComponentMeta> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseCodeComponentMeta;
}
export function isExactlyCodeComponentMeta(x: any): x is CodeComponentMeta {
  return x?.['typeTag'] === 'CodeComponentMeta';
}

export function ensureKnownCodeComponentMeta<T>(
  x: [Extract<T, CodeComponentMeta>] extends [never] ? never : T,
): CodeComponentMeta {
  assert(isKnownCodeComponentMeta(x), () =>
    mkUnexpectedTypeMsg([CodeComponentMeta], x),
  );
  return x;
}
export function ensureMaybeKnownCodeComponentMeta<T>(
  x: [Extract<T, CodeComponentMeta>] extends [never] ? never : T,
): CodeComponentMeta | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownCodeComponentMeta(x);
}

export type CodeComponentMeta = KnownCodeComponentMeta;
export interface CodeComponentMetaParams {
  importPath: string /*  */;
  defaultExport: boolean /*  */;
  displayName: string | null | undefined /*  */;
  importName: string | null | undefined /*  */;
  description: string | null | undefined /*  */;
  classNameProp: string | null | undefined /*  */;
  refProp: string | null | undefined /*  */;
  defaultStyles: RuleSet | null | undefined /*  */;
  isHostLess: boolean /*  */;
  isContext: boolean /*  */;
  isAttachment: boolean /*  */;
  providesData: boolean /*  */;
  hasRef: boolean /*  */;
  isRepeatable: boolean /*  */;
  styleSections: boolean | null | undefined /*  */;
  helpers: CodeComponentHelper | null | undefined /*  */;
  defaultSlotContents: {[key: string]: any} /*  */;
}

abstract class BaseCodeComponentMeta {
  static isKnown(x: any): x is CodeComponentMeta {
    return isKnownCodeComponentMeta(x);
  }
  static getType(): CodeComponentMeta {
    throw new Error();
  }
  static modelTypeName = 'CodeComponentMeta';

  constructor(args: CodeComponentMetaParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.CodeComponentMeta(this, args);
    }
  }
  uid: number;
  importPath: string /*  */;
  defaultExport: boolean /*  */;
  displayName: string | null | undefined /*  */;
  importName: string | null | undefined /*  */;
  description: string | null | undefined /*  */;
  classNameProp: string | null | undefined /*  */;
  refProp: string | null | undefined /*  */;
  defaultStyles: RuleSet | null | undefined /*  */;
  isHostLess: boolean /*  */;
  isContext: boolean /*  */;
  isAttachment: boolean /*  */;
  providesData: boolean /*  */;
  hasRef: boolean /*  */;
  isRepeatable: boolean /*  */;
  styleSections: boolean | null | undefined /*  */;
  helpers: CodeComponentHelper | null | undefined /*  */;
  defaultSlotContents: {[key: string]: any} /*  */;
}
class ClsCodeComponentMeta extends BaseCodeComponentMeta {
  get typeTag(): 'CodeComponentMeta' {
    return 'CodeComponentMeta';
  }
}
export const CodeComponentMeta = ClsCodeComponentMeta;

type KnownComponent = ClsComponent;
export function isKnownComponent<T>(
  x: [Extract<T, Component>] extends [never] ? never : T,
): x is [Extract<T, Component>] extends [never]
  ? never
  : Component extends T // Needed when T is any
  ? Component
  : Extract<T, Component> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseComponent;
}
export function isExactlyComponent(x: any): x is Component {
  return x?.['typeTag'] === 'Component';
}

export function ensureKnownComponent<T>(
  x: [Extract<T, Component>] extends [never] ? never : T,
): Component {
  assert(isKnownComponent(x), () => mkUnexpectedTypeMsg([Component], x));
  return x;
}
export function ensureMaybeKnownComponent<T>(
  x: [Extract<T, Component>] extends [never] ? never : T,
): Component | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownComponent(x);
}

export type Component = KnownComponent;
export interface ComponentParams {
  readonly uuid: string /* Const */;
  name: string /*  */;
  params: Array<Param> /*  */;
  states: Array<State> /*  */;
  tplTree: TplNode /*  */;
  editableByContentEditor: boolean /*  */;
  hiddenFromContentEditor: boolean /*  */;
  variants: Array<Variant> /*  */;
  variantGroups: Array<VariantGroup> /*  */;
  pageMeta: PageMeta | null | undefined /*  */;
  codeComponentMeta: CodeComponentMeta | null | undefined /*  */;
  type: string /*  */;
  subComps: Array<Component> /* WeakRef */;
  superComp: Component | null | undefined /* WeakRef */;
  readonly plumeInfo: PlumeInfo | null | undefined /* Const */;
  templateInfo: ComponentTemplateInfo | null | undefined /*  */;
  metadata: {[key: string]: string} /*  */;
  dataQueries: Array<ComponentDataQuery> /*  */;
  figmaMappings: Array<FigmaComponentMapping> /*  */;
  alwaysAutoName: boolean /*  */;
  trapsFocus: boolean /*  */;
}

abstract class BaseComponent {
  static isKnown(x: any): x is Component {
    return isKnownComponent(x);
  }
  static getType(): Component {
    throw new Error();
  }
  static modelTypeName = 'Component';

  constructor(args: ComponentParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.Component(this, args);
    }
  }
  uid: number;
  readonly uuid: string /* Const */;
  name: string /*  */;
  params: Array<Param> /*  */;
  states: Array<State> /*  */;
  tplTree: TplNode /*  */;
  editableByContentEditor: boolean /*  */;
  hiddenFromContentEditor: boolean /*  */;
  variants: Array<Variant> /*  */;
  variantGroups: Array<VariantGroup> /*  */;
  pageMeta: PageMeta | null | undefined /*  */;
  codeComponentMeta: CodeComponentMeta | null | undefined /*  */;
  type: string /*  */;
  subComps: Array<Component> /* WeakRef */;
  superComp: Component | null | undefined /* WeakRef */;
  readonly plumeInfo: PlumeInfo | null | undefined /* Const */;
  templateInfo: ComponentTemplateInfo | null | undefined /*  */;
  metadata: {[key: string]: string} /*  */;
  dataQueries: Array<ComponentDataQuery> /*  */;
  figmaMappings: Array<FigmaComponentMapping> /*  */;
  alwaysAutoName: boolean /*  */;
  trapsFocus: boolean /*  */;
}
class ClsComponent extends BaseComponent {
  get typeTag(): 'Component' {
    return 'Component';
  }
}
export const Component = ClsComponent;

type KnownNameArg = ClsNameArg;
export function isKnownNameArg<T>(
  x: [Extract<T, NameArg>] extends [never] ? never : T,
): x is [Extract<T, NameArg>] extends [never]
  ? never
  : NameArg extends T // Needed when T is any
  ? NameArg
  : Extract<T, NameArg> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseNameArg;
}
export function isExactlyNameArg(x: any): x is NameArg {
  return x?.['typeTag'] === 'NameArg';
}

export function ensureKnownNameArg<T>(
  x: [Extract<T, NameArg>] extends [never] ? never : T,
): NameArg {
  assert(isKnownNameArg(x), () => mkUnexpectedTypeMsg([NameArg], x));
  return x;
}
export function ensureMaybeKnownNameArg<T>(
  x: [Extract<T, NameArg>] extends [never] ? never : T,
): NameArg | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownNameArg(x);
}

export type NameArg = KnownNameArg;
export interface NameArgParams {
  name: string /*  */;
  expr: Expr /*  */;
}

abstract class BaseNameArg {
  static isKnown(x: any): x is NameArg {
    return isKnownNameArg(x);
  }
  static getType(): NameArg {
    throw new Error();
  }
  static modelTypeName = 'NameArg';

  constructor(args: NameArgParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.NameArg(this, args);
    }
  }
  uid: number;
  name: string /*  */;
  expr: Expr /*  */;
}
class ClsNameArg extends BaseNameArg {
  get typeTag(): 'NameArg' {
    return 'NameArg';
  }
}
export const NameArg = ClsNameArg;

type KnownPlumeInfo = ClsPlumeInfo;
export function isKnownPlumeInfo<T>(
  x: [Extract<T, PlumeInfo>] extends [never] ? never : T,
): x is [Extract<T, PlumeInfo>] extends [never]
  ? never
  : PlumeInfo extends T // Needed when T is any
  ? PlumeInfo
  : Extract<T, PlumeInfo> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BasePlumeInfo;
}
export function isExactlyPlumeInfo(x: any): x is PlumeInfo {
  return x?.['typeTag'] === 'PlumeInfo';
}

export function ensureKnownPlumeInfo<T>(
  x: [Extract<T, PlumeInfo>] extends [never] ? never : T,
): PlumeInfo {
  assert(isKnownPlumeInfo(x), () => mkUnexpectedTypeMsg([PlumeInfo], x));
  return x;
}
export function ensureMaybeKnownPlumeInfo<T>(
  x: [Extract<T, PlumeInfo>] extends [never] ? never : T,
): PlumeInfo | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownPlumeInfo(x);
}

export type PlumeInfo = KnownPlumeInfo;
export interface PlumeInfoParams {
  type: string /*  */;
}

abstract class BasePlumeInfo {
  static isKnown(x: any): x is PlumeInfo {
    return isKnownPlumeInfo(x);
  }
  static getType(): PlumeInfo {
    throw new Error();
  }
  static modelTypeName = 'PlumeInfo';

  constructor(args: PlumeInfoParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.PlumeInfo(this, args);
    }
  }
  uid: number;
  type: string /*  */;
}
class ClsPlumeInfo extends BasePlumeInfo {
  get typeTag(): 'PlumeInfo' {
    return 'PlumeInfo';
  }
}
export const PlumeInfo = ClsPlumeInfo;

type KnownComponentTemplateInfo = ClsComponentTemplateInfo;
export function isKnownComponentTemplateInfo<T>(
  x: [Extract<T, ComponentTemplateInfo>] extends [never] ? never : T,
): x is [Extract<T, ComponentTemplateInfo>] extends [never]
  ? never
  : ComponentTemplateInfo extends T // Needed when T is any
  ? ComponentTemplateInfo
  : Extract<T, ComponentTemplateInfo> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseComponentTemplateInfo;
}
export function isExactlyComponentTemplateInfo(
  x: any,
): x is ComponentTemplateInfo {
  return x?.['typeTag'] === 'ComponentTemplateInfo';
}

export function ensureKnownComponentTemplateInfo<T>(
  x: [Extract<T, ComponentTemplateInfo>] extends [never] ? never : T,
): ComponentTemplateInfo {
  assert(isKnownComponentTemplateInfo(x), () =>
    mkUnexpectedTypeMsg([ComponentTemplateInfo], x),
  );
  return x;
}
export function ensureMaybeKnownComponentTemplateInfo<T>(
  x: [Extract<T, ComponentTemplateInfo>] extends [never] ? never : T,
): ComponentTemplateInfo | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownComponentTemplateInfo(x);
}

export type ComponentTemplateInfo = KnownComponentTemplateInfo;
export interface ComponentTemplateInfoParams {
  name: string /*  */;
}

abstract class BaseComponentTemplateInfo {
  static isKnown(x: any): x is ComponentTemplateInfo {
    return isKnownComponentTemplateInfo(x);
  }
  static getType(): ComponentTemplateInfo {
    throw new Error();
  }
  static modelTypeName = 'ComponentTemplateInfo';

  constructor(args: ComponentTemplateInfoParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.ComponentTemplateInfo(this, args);
    }
  }
  uid: number;
  name: string /*  */;
}
class ClsComponentTemplateInfo extends BaseComponentTemplateInfo {
  get typeTag(): 'ComponentTemplateInfo' {
    return 'ComponentTemplateInfo';
  }
}
export const ComponentTemplateInfo = ClsComponentTemplateInfo;

type KnownVariant = ClsVariant;
export function isKnownVariant<T>(
  x: [Extract<T, Variant>] extends [never] ? never : T,
): x is [Extract<T, Variant>] extends [never]
  ? never
  : Variant extends T // Needed when T is any
  ? Variant
  : Extract<T, Variant> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseVariant;
}
export function isExactlyVariant(x: any): x is Variant {
  return x?.['typeTag'] === 'Variant';
}

export function ensureKnownVariant<T>(
  x: [Extract<T, Variant>] extends [never] ? never : T,
): Variant {
  assert(isKnownVariant(x), () => mkUnexpectedTypeMsg([Variant], x));
  return x;
}
export function ensureMaybeKnownVariant<T>(
  x: [Extract<T, Variant>] extends [never] ? never : T,
): Variant | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownVariant(x);
}

export type Variant = KnownVariant;
export interface VariantParams {
  readonly uuid: string /* Const */;
  name: string /*  */;
  selectors: Array<string> | null | undefined /*  */;
  parent: VariantGroup | null | undefined /* WeakRef */;
  mediaQuery: string | null | undefined /*  */;
  description: string | null | undefined /*  */;
  forTpl:
    | TplTag
    | null
    | undefined
    | TplComponent
    | null
    | undefined
    | TplSlot
    | null
    | undefined /* WeakRef */;
}

abstract class BaseVariant {
  static isKnown(x: any): x is Variant {
    return isKnownVariant(x);
  }
  static getType(): Variant {
    throw new Error();
  }
  static modelTypeName = 'Variant';

  constructor(args: VariantParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.Variant(this, args);
    }
  }
  uid: number;
  readonly uuid: string /* Const */;
  name: string /*  */;
  selectors: Array<string> | null | undefined /*  */;
  parent: VariantGroup | null | undefined /* WeakRef */;
  mediaQuery: string | null | undefined /*  */;
  description: string | null | undefined /*  */;
  forTpl:
    | TplTag
    | null
    | undefined
    | TplComponent
    | null
    | undefined
    | TplSlot
    | null
    | undefined /* WeakRef */;
}
class ClsVariant extends BaseVariant {
  get typeTag(): 'Variant' {
    return 'Variant';
  }
}
export const Variant = ClsVariant;

type KnownVariantGroup = KnownComponentVariantGroup | ClsVariantGroup;
export function isKnownVariantGroup<T>(
  x: [Extract<T, VariantGroup>] extends [never] ? never : T,
): x is [Extract<T, VariantGroup>] extends [never]
  ? never
  : VariantGroup extends T // Needed when T is any
  ? VariantGroup
  : Extract<T, VariantGroup> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseVariantGroup;
}
export function isExactlyVariantGroup(x: any): x is VariantGroup {
  return x?.['typeTag'] === 'VariantGroup';
}

export function ensureKnownVariantGroup<T>(
  x: [Extract<T, VariantGroup>] extends [never] ? never : T,
): VariantGroup {
  assert(isKnownVariantGroup(x), () => mkUnexpectedTypeMsg([VariantGroup], x));
  return x;
}
export function ensureMaybeKnownVariantGroup<T>(
  x: [Extract<T, VariantGroup>] extends [never] ? never : T,
): VariantGroup | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownVariantGroup(x);
}

export type VariantGroup = KnownVariantGroup;
export interface VariantGroupParams {
  readonly uuid: string /* Const */;
  param: Param /*  */;
  variants: Array<Variant> /*  */;
  multi: boolean /*  */;
  type: string /*  */;
  linkedState: State | null | undefined /* WeakRef */;
}

abstract class BaseVariantGroup {
  static isKnown(x: any): x is VariantGroup {
    return isKnownVariantGroup(x);
  }
  static getType(): VariantGroup {
    throw new Error();
  }
  static modelTypeName = 'VariantGroup';

  constructor(args: VariantGroupParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.VariantGroup(this, args);
    }
  }
  uid: number;
  readonly uuid: string /* Const */;
  param: Param /*  */;
  variants: Array<Variant> /*  */;
  multi: boolean /*  */;
  type: string /*  */;
  linkedState: State | null | undefined /* WeakRef */;
}
class ClsVariantGroup extends BaseVariantGroup {
  get typeTag(): 'VariantGroup' {
    return 'VariantGroup';
  }
}
export const VariantGroup = ClsVariantGroup;

type KnownComponentVariantGroup = ClsComponentVariantGroup;
export function isKnownComponentVariantGroup<T>(
  x: [Extract<T, ComponentVariantGroup>] extends [never] ? never : T,
): x is [Extract<T, ComponentVariantGroup>] extends [never]
  ? never
  : ComponentVariantGroup extends T // Needed when T is any
  ? ComponentVariantGroup
  : Extract<T, ComponentVariantGroup> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseComponentVariantGroup;
}
export function isExactlyComponentVariantGroup(
  x: any,
): x is ComponentVariantGroup {
  return x?.['typeTag'] === 'ComponentVariantGroup';
}

export function ensureKnownComponentVariantGroup<T>(
  x: [Extract<T, ComponentVariantGroup>] extends [never] ? never : T,
): ComponentVariantGroup {
  assert(isKnownComponentVariantGroup(x), () =>
    mkUnexpectedTypeMsg([ComponentVariantGroup], x),
  );
  return x;
}
export function ensureMaybeKnownComponentVariantGroup<T>(
  x: [Extract<T, ComponentVariantGroup>] extends [never] ? never : T,
): ComponentVariantGroup | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownComponentVariantGroup(x);
}

export type ComponentVariantGroup = KnownComponentVariantGroup;
export interface ComponentVariantGroupParams {
  param: Param /* WeakRef */;
  readonly uuid: string /* Const */;
  variants: Array<Variant> /*  */;
  multi: boolean /*  */;
  type: string /*  */;
  linkedState: State | null | undefined /* WeakRef */;
}

abstract class BaseComponentVariantGroup extends BaseVariantGroup {
  static isKnown(x: any): x is ComponentVariantGroup {
    return isKnownComponentVariantGroup(x);
  }
  static getType(): ComponentVariantGroup {
    throw new Error();
  }
  static modelTypeName = 'ComponentVariantGroup';

  constructor(args: ComponentVariantGroupParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.ComponentVariantGroup(this, args);
    }
  }
  uid: number;
  param: Param /* WeakRef */;
  readonly uuid: string /* Const */;
  variants: Array<Variant> /*  */;
  multi: boolean /*  */;
  type: string /*  */;
  linkedState: State | null | undefined /* WeakRef */;
}
class ClsComponentVariantGroup extends BaseComponentVariantGroup {
  get typeTag(): 'ComponentVariantGroup' {
    return 'ComponentVariantGroup';
  }
}
export const ComponentVariantGroup = ClsComponentVariantGroup;

type KnownVariantSetting = ClsVariantSetting;
export function isKnownVariantSetting<T>(
  x: [Extract<T, VariantSetting>] extends [never] ? never : T,
): x is [Extract<T, VariantSetting>] extends [never]
  ? never
  : VariantSetting extends T // Needed when T is any
  ? VariantSetting
  : Extract<T, VariantSetting> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseVariantSetting;
}
export function isExactlyVariantSetting(x: any): x is VariantSetting {
  return x?.['typeTag'] === 'VariantSetting';
}

export function ensureKnownVariantSetting<T>(
  x: [Extract<T, VariantSetting>] extends [never] ? never : T,
): VariantSetting {
  assert(isKnownVariantSetting(x), () =>
    mkUnexpectedTypeMsg([VariantSetting], x),
  );
  return x;
}
export function ensureMaybeKnownVariantSetting<T>(
  x: [Extract<T, VariantSetting>] extends [never] ? never : T,
): VariantSetting | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownVariantSetting(x);
}

export type VariantSetting = KnownVariantSetting;
export interface VariantSettingParams {
  variants: Array<Variant> /* WeakRef */;
  args: Array<Arg> /*  */;
  attrs: {[key: string]: Expr} /*  */;
  rs: RuleSet /*  */;
  dataCond: Expr | null | undefined /*  */;
  dataRep: Rep | null | undefined /*  */;
  text: RichText | null | undefined /*  */;
  columnsConfig: ColumnsConfig | null | undefined /*  */;
}

abstract class BaseVariantSetting {
  static isKnown(x: any): x is VariantSetting {
    return isKnownVariantSetting(x);
  }
  static getType(): VariantSetting {
    throw new Error();
  }
  static modelTypeName = 'VariantSetting';

  constructor(args: VariantSettingParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.VariantSetting(this, args);
    }
  }
  uid: number;
  variants: Array<Variant> /* WeakRef */;
  args: Array<Arg> /*  */;
  attrs: {[key: string]: Expr} /*  */;
  rs: RuleSet /*  */;
  dataCond: Expr | null | undefined /*  */;
  dataRep: Rep | null | undefined /*  */;
  text: RichText | null | undefined /*  */;
  columnsConfig: ColumnsConfig | null | undefined /*  */;
}
class ClsVariantSetting extends BaseVariantSetting {
  get typeTag(): 'VariantSetting' {
    return 'VariantSetting';
  }
}
export const VariantSetting = ClsVariantSetting;

type KnownInteraction = ClsInteraction;
export function isKnownInteraction<T>(
  x: [Extract<T, Interaction>] extends [never] ? never : T,
): x is [Extract<T, Interaction>] extends [never]
  ? never
  : Interaction extends T // Needed when T is any
  ? Interaction
  : Extract<T, Interaction> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseInteraction;
}
export function isExactlyInteraction(x: any): x is Interaction {
  return x?.['typeTag'] === 'Interaction';
}

export function ensureKnownInteraction<T>(
  x: [Extract<T, Interaction>] extends [never] ? never : T,
): Interaction {
  assert(isKnownInteraction(x), () => mkUnexpectedTypeMsg([Interaction], x));
  return x;
}
export function ensureMaybeKnownInteraction<T>(
  x: [Extract<T, Interaction>] extends [never] ? never : T,
): Interaction | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownInteraction(x);
}

export type Interaction = KnownInteraction;
export interface InteractionParams {
  interactionName: string /*  */;
  actionName: string /*  */;
  args: Array<NameArg> /*  */;
  condExpr: Expr | null | undefined /*  */;
  conditionalMode: string /*  */;
  readonly uuid: string /* Const */;
  parent: EventHandler /* WeakRef */;
}

abstract class BaseInteraction {
  static isKnown(x: any): x is Interaction {
    return isKnownInteraction(x);
  }
  static getType(): Interaction {
    throw new Error();
  }
  static modelTypeName = 'Interaction';

  constructor(args: InteractionParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.Interaction(this, args);
    }
  }
  uid: number;
  interactionName: string /*  */;
  actionName: string /*  */;
  args: Array<NameArg> /*  */;
  condExpr: Expr | null | undefined /*  */;
  conditionalMode: string /*  */;
  readonly uuid: string /* Const */;
  parent: EventHandler /* WeakRef */;
}
class ClsInteraction extends BaseInteraction {
  get typeTag(): 'Interaction' {
    return 'Interaction';
  }
}
export const Interaction = ClsInteraction;

type KnownColumnsConfig = ClsColumnsConfig;
export function isKnownColumnsConfig<T>(
  x: [Extract<T, ColumnsConfig>] extends [never] ? never : T,
): x is [Extract<T, ColumnsConfig>] extends [never]
  ? never
  : ColumnsConfig extends T // Needed when T is any
  ? ColumnsConfig
  : Extract<T, ColumnsConfig> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseColumnsConfig;
}
export function isExactlyColumnsConfig(x: any): x is ColumnsConfig {
  return x?.['typeTag'] === 'ColumnsConfig';
}

export function ensureKnownColumnsConfig<T>(
  x: [Extract<T, ColumnsConfig>] extends [never] ? never : T,
): ColumnsConfig {
  assert(isKnownColumnsConfig(x), () =>
    mkUnexpectedTypeMsg([ColumnsConfig], x),
  );
  return x;
}
export function ensureMaybeKnownColumnsConfig<T>(
  x: [Extract<T, ColumnsConfig>] extends [never] ? never : T,
): ColumnsConfig | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownColumnsConfig(x);
}

export type ColumnsConfig = KnownColumnsConfig;
export interface ColumnsConfigParams {
  breakUpRows: boolean /*  */;
  colsSizes: Array<number> /*  */;
}

abstract class BaseColumnsConfig {
  static isKnown(x: any): x is ColumnsConfig {
    return isKnownColumnsConfig(x);
  }
  static getType(): ColumnsConfig {
    throw new Error();
  }
  static modelTypeName = 'ColumnsConfig';

  constructor(args: ColumnsConfigParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.ColumnsConfig(this, args);
    }
  }
  uid: number;
  breakUpRows: boolean /*  */;
  colsSizes: Array<number> /*  */;
}
class ClsColumnsConfig extends BaseColumnsConfig {
  get typeTag(): 'ColumnsConfig' {
    return 'ColumnsConfig';
  }
}
export const ColumnsConfig = ClsColumnsConfig;

type KnownMarker = KnownStyleMarker | KnownNodeMarker;
export function isKnownMarker<T>(
  x: [Extract<T, Marker>] extends [never] ? never : T,
): x is [Extract<T, Marker>] extends [never]
  ? never
  : Marker extends T // Needed when T is any
  ? Marker
  : Extract<T, Marker> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseMarker;
}

export function ensureKnownMarker<T>(
  x: [Extract<T, Marker>] extends [never] ? never : T,
): Marker {
  assert(isKnownMarker(x), () => mkUnexpectedTypeMsg([Marker], x));
  return x;
}
export function ensureMaybeKnownMarker<T>(
  x: [Extract<T, Marker>] extends [never] ? never : T,
): Marker | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownMarker(x);
}

export type Marker = KnownMarker;
export interface MarkerParams {
  position: number /*  */;
  length: number /*  */;
}

abstract class BaseMarker {
  static isKnown(x: any): x is Marker {
    return isKnownMarker(x);
  }
  static getType(): Marker {
    throw new Error();
  }
  static modelTypeName = 'Marker';

  constructor(args: MarkerParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.Marker(this, args);
    }
  }
  uid: number;
  position: number /*  */;
  length: number /*  */;
}

export const Marker = BaseMarker;

type KnownStyleMarker = ClsStyleMarker;
export function isKnownStyleMarker<T>(
  x: [Extract<T, StyleMarker>] extends [never] ? never : T,
): x is [Extract<T, StyleMarker>] extends [never]
  ? never
  : StyleMarker extends T // Needed when T is any
  ? StyleMarker
  : Extract<T, StyleMarker> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseStyleMarker;
}
export function isExactlyStyleMarker(x: any): x is StyleMarker {
  return x?.['typeTag'] === 'StyleMarker';
}

export function ensureKnownStyleMarker<T>(
  x: [Extract<T, StyleMarker>] extends [never] ? never : T,
): StyleMarker {
  assert(isKnownStyleMarker(x), () => mkUnexpectedTypeMsg([StyleMarker], x));
  return x;
}
export function ensureMaybeKnownStyleMarker<T>(
  x: [Extract<T, StyleMarker>] extends [never] ? never : T,
): StyleMarker | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownStyleMarker(x);
}

export type StyleMarker = KnownStyleMarker;
export interface StyleMarkerParams {
  rs: RuleSet /*  */;
  position: number /*  */;
  length: number /*  */;
}

abstract class BaseStyleMarker extends BaseMarker {
  static isKnown(x: any): x is StyleMarker {
    return isKnownStyleMarker(x);
  }
  static getType(): StyleMarker {
    throw new Error();
  }
  static modelTypeName = 'StyleMarker';

  constructor(args: StyleMarkerParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.StyleMarker(this, args);
    }
  }
  uid: number;
  rs: RuleSet /*  */;
  position: number /*  */;
  length: number /*  */;
}
class ClsStyleMarker extends BaseStyleMarker {
  get typeTag(): 'StyleMarker' {
    return 'StyleMarker';
  }
}
export const StyleMarker = ClsStyleMarker;

type KnownNodeMarker = ClsNodeMarker;
export function isKnownNodeMarker<T>(
  x: [Extract<T, NodeMarker>] extends [never] ? never : T,
): x is [Extract<T, NodeMarker>] extends [never]
  ? never
  : NodeMarker extends T // Needed when T is any
  ? NodeMarker
  : Extract<T, NodeMarker> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseNodeMarker;
}
export function isExactlyNodeMarker(x: any): x is NodeMarker {
  return x?.['typeTag'] === 'NodeMarker';
}

export function ensureKnownNodeMarker<T>(
  x: [Extract<T, NodeMarker>] extends [never] ? never : T,
): NodeMarker {
  assert(isKnownNodeMarker(x), () => mkUnexpectedTypeMsg([NodeMarker], x));
  return x;
}
export function ensureMaybeKnownNodeMarker<T>(
  x: [Extract<T, NodeMarker>] extends [never] ? never : T,
): NodeMarker | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownNodeMarker(x);
}

export type NodeMarker = KnownNodeMarker;
export interface NodeMarkerParams {
  tpl: TplNode /* WeakRef */;
  position: number /*  */;
  length: number /*  */;
}

abstract class BaseNodeMarker extends BaseMarker {
  static isKnown(x: any): x is NodeMarker {
    return isKnownNodeMarker(x);
  }
  static getType(): NodeMarker {
    throw new Error();
  }
  static modelTypeName = 'NodeMarker';

  constructor(args: NodeMarkerParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.NodeMarker(this, args);
    }
  }
  uid: number;
  tpl: TplNode /* WeakRef */;
  position: number /*  */;
  length: number /*  */;
}
class ClsNodeMarker extends BaseNodeMarker {
  get typeTag(): 'NodeMarker' {
    return 'NodeMarker';
  }
}
export const NodeMarker = ClsNodeMarker;

type KnownRichText = KnownRawText | KnownExprText;
export function isKnownRichText<T>(
  x: [Extract<T, RichText>] extends [never] ? never : T,
): x is [Extract<T, RichText>] extends [never]
  ? never
  : RichText extends T // Needed when T is any
  ? RichText
  : Extract<T, RichText> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseRichText;
}

export function ensureKnownRichText<T>(
  x: [Extract<T, RichText>] extends [never] ? never : T,
): RichText {
  assert(isKnownRichText(x), () => mkUnexpectedTypeMsg([RichText], x));
  return x;
}
export function ensureMaybeKnownRichText<T>(
  x: [Extract<T, RichText>] extends [never] ? never : T,
): RichText | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownRichText(x);
}

export type RichText = KnownRichText;
export interface RichTextParams {}

abstract class BaseRichText {
  static isKnown(x: any): x is RichText {
    return isKnownRichText(x);
  }
  static getType(): RichText {
    throw new Error();
  }
  static modelTypeName = 'RichText';

  constructor(args: RichTextParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.RichText(this, args);
    }
  }
  uid: number;
}

export const RichText = BaseRichText;

type KnownRawText = ClsRawText;
export function isKnownRawText<T>(
  x: [Extract<T, RawText>] extends [never] ? never : T,
): x is [Extract<T, RawText>] extends [never]
  ? never
  : RawText extends T // Needed when T is any
  ? RawText
  : Extract<T, RawText> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseRawText;
}
export function isExactlyRawText(x: any): x is RawText {
  return x?.['typeTag'] === 'RawText';
}

export function ensureKnownRawText<T>(
  x: [Extract<T, RawText>] extends [never] ? never : T,
): RawText {
  assert(isKnownRawText(x), () => mkUnexpectedTypeMsg([RawText], x));
  return x;
}
export function ensureMaybeKnownRawText<T>(
  x: [Extract<T, RawText>] extends [never] ? never : T,
): RawText | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownRawText(x);
}

export type RawText = KnownRawText;
export interface RawTextParams {
  markers: Array<Marker> /*  */;
  text: string /*  */;
}

abstract class BaseRawText extends BaseRichText {
  static isKnown(x: any): x is RawText {
    return isKnownRawText(x);
  }
  static getType(): RawText {
    throw new Error();
  }
  static modelTypeName = 'RawText';

  constructor(args: RawTextParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.RawText(this, args);
    }
  }
  uid: number;
  markers: Array<Marker> /*  */;
  text: string /*  */;
}
class ClsRawText extends BaseRawText {
  get typeTag(): 'RawText' {
    return 'RawText';
  }
}
export const RawText = ClsRawText;

type KnownExprText = ClsExprText;
export function isKnownExprText<T>(
  x: [Extract<T, ExprText>] extends [never] ? never : T,
): x is [Extract<T, ExprText>] extends [never]
  ? never
  : ExprText extends T // Needed when T is any
  ? ExprText
  : Extract<T, ExprText> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseExprText;
}
export function isExactlyExprText(x: any): x is ExprText {
  return x?.['typeTag'] === 'ExprText';
}

export function ensureKnownExprText<T>(
  x: [Extract<T, ExprText>] extends [never] ? never : T,
): ExprText {
  assert(isKnownExprText(x), () => mkUnexpectedTypeMsg([ExprText], x));
  return x;
}
export function ensureMaybeKnownExprText<T>(
  x: [Extract<T, ExprText>] extends [never] ? never : T,
): ExprText | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownExprText(x);
}

export type ExprText = KnownExprText;
export interface ExprTextParams {
  expr: Expr /*  */;
  html: boolean /*  */;
}

abstract class BaseExprText extends BaseRichText {
  static isKnown(x: any): x is ExprText {
    return isKnownExprText(x);
  }
  static getType(): ExprText {
    throw new Error();
  }
  static modelTypeName = 'ExprText';

  constructor(args: ExprTextParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.ExprText(this, args);
    }
  }
  uid: number;
  expr: Expr /*  */;
  html: boolean /*  */;
}
class ClsExprText extends BaseExprText {
  get typeTag(): 'ExprText' {
    return 'ExprText';
  }
}
export const ExprText = ClsExprText;

type KnownVar = ClsVar;
export function isKnownVar<T>(
  x: [Extract<T, Var>] extends [never] ? never : T,
): x is [Extract<T, Var>] extends [never]
  ? never
  : Var extends T // Needed when T is any
  ? Var
  : Extract<T, Var> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseVar;
}
export function isExactlyVar(x: any): x is Var {
  return x?.['typeTag'] === 'Var';
}

export function ensureKnownVar<T>(
  x: [Extract<T, Var>] extends [never] ? never : T,
): Var {
  assert(isKnownVar(x), () => mkUnexpectedTypeMsg([Var], x));
  return x;
}
export function ensureMaybeKnownVar<T>(
  x: [Extract<T, Var>] extends [never] ? never : T,
): Var | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownVar(x);
}

export type Var = KnownVar;
export interface VarParams {
  name: string /*  */;
  readonly uuid: string /* Const */;
}

abstract class BaseVar {
  static isKnown(x: any): x is Var {
    return isKnownVar(x);
  }
  static getType(): Var {
    throw new Error();
  }
  static modelTypeName = 'Var';

  constructor(args: VarParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.Var(this, args);
    }
  }
  uid: number;
  name: string /*  */;
  readonly uuid: string /* Const */;
}
class ClsVar extends BaseVar {
  get typeTag(): 'Var' {
    return 'Var';
  }
}
export const Var = ClsVar;

type KnownBindingStruct = KnownRep | KnownParam | KnownArg;
export function isKnownBindingStruct<T>(
  x: [Extract<T, BindingStruct>] extends [never] ? never : T,
): x is [Extract<T, BindingStruct>] extends [never]
  ? never
  : BindingStruct extends T // Needed when T is any
  ? BindingStruct
  : Extract<T, BindingStruct> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseBindingStruct;
}

export function ensureKnownBindingStruct<T>(
  x: [Extract<T, BindingStruct>] extends [never] ? never : T,
): BindingStruct {
  assert(isKnownBindingStruct(x), () =>
    mkUnexpectedTypeMsg([BindingStruct], x),
  );
  return x;
}
export function ensureMaybeKnownBindingStruct<T>(
  x: [Extract<T, BindingStruct>] extends [never] ? never : T,
): BindingStruct | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownBindingStruct(x);
}

export type BindingStruct = KnownBindingStruct;
export interface BindingStructParams {}

abstract class BaseBindingStruct {
  static isKnown(x: any): x is BindingStruct {
    return isKnownBindingStruct(x);
  }
  static getType(): BindingStruct {
    throw new Error();
  }
  static modelTypeName = 'BindingStruct';

  constructor(args: BindingStructParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.BindingStruct(this, args);
    }
  }
  uid: number;
}

export const BindingStruct = BaseBindingStruct;

type KnownRep = ClsRep;
export function isKnownRep<T>(
  x: [Extract<T, Rep>] extends [never] ? never : T,
): x is [Extract<T, Rep>] extends [never]
  ? never
  : Rep extends T // Needed when T is any
  ? Rep
  : Extract<T, Rep> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseRep;
}
export function isExactlyRep(x: any): x is Rep {
  return x?.['typeTag'] === 'Rep';
}

export function ensureKnownRep<T>(
  x: [Extract<T, Rep>] extends [never] ? never : T,
): Rep {
  assert(isKnownRep(x), () => mkUnexpectedTypeMsg([Rep], x));
  return x;
}
export function ensureMaybeKnownRep<T>(
  x: [Extract<T, Rep>] extends [never] ? never : T,
): Rep | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownRep(x);
}

export type Rep = KnownRep;
export interface RepParams {
  element: Var /*  */;
  index: Var | null | undefined /*  */;
  collection: Expr /*  */;
}

abstract class BaseRep extends BaseBindingStruct {
  static isKnown(x: any): x is Rep {
    return isKnownRep(x);
  }
  static getType(): Rep {
    throw new Error();
  }
  static modelTypeName = 'Rep';

  constructor(args: RepParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.Rep(this, args);
    }
  }
  uid: number;
  element: Var /*  */;
  index: Var | null | undefined /*  */;
  collection: Expr /*  */;
}
class ClsRep extends BaseRep {
  get typeTag(): 'Rep' {
    return 'Rep';
  }
}
export const Rep = ClsRep;

type KnownParam = ClsParam;
export function isKnownParam<T>(
  x: [Extract<T, Param>] extends [never] ? never : T,
): x is [Extract<T, Param>] extends [never]
  ? never
  : Param extends T // Needed when T is any
  ? Param
  : Extract<T, Param> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseParam;
}
export function isExactlyParam(x: any): x is Param {
  return x?.['typeTag'] === 'Param';
}

export function ensureKnownParam<T>(
  x: [Extract<T, Param>] extends [never] ? never : T,
): Param {
  assert(isKnownParam(x), () => mkUnexpectedTypeMsg([Param], x));
  return x;
}
export function ensureMaybeKnownParam<T>(
  x: [Extract<T, Param>] extends [never] ? never : T,
): Param | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownParam(x);
}

export type Param = KnownParam;
export interface ParamParams {
  variable: Var /*  */;
  type: Type /*  */;
  readonly uuid: string /* Const */;
  enumValues: Array<string | boolean | number> /*  */;
  origin: string | number | null | undefined /*  */;
  exportType: string /*  */;
  defaultExpr: Expr | null | undefined /*  */;
  previewExpr: Expr | null | undefined /*  */;
  propEffect: string | null | undefined /*  */;
  description: string | null | undefined /*  */;
  displayName: string | null | undefined /*  */;
  about: string | null | undefined /*  */;
  isRepeated: boolean | null | undefined /*  */;
  isMainContentSlot: boolean /*  */;
  required: boolean /*  */;
  mergeWithParent: boolean /*  */;
  isLocalizable: boolean /*  */;
}

abstract class BaseParam extends BaseBindingStruct {
  static isKnown(x: any): x is Param {
    return isKnownParam(x);
  }
  static getType(): Param {
    throw new Error();
  }
  static modelTypeName = 'Param';

  constructor(args: ParamParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.Param(this, args);
    }
  }
  uid: number;
  variable: Var /*  */;
  type: Type /*  */;
  readonly uuid: string /* Const */;
  enumValues: Array<string | boolean | number> /*  */;
  origin: string | number | null | undefined /*  */;
  exportType: string /*  */;
  defaultExpr: Expr | null | undefined /*  */;
  previewExpr: Expr | null | undefined /*  */;
  propEffect: string | null | undefined /*  */;
  description: string | null | undefined /*  */;
  displayName: string | null | undefined /*  */;
  about: string | null | undefined /*  */;
  isRepeated: boolean | null | undefined /*  */;
  isMainContentSlot: boolean /*  */;
  required: boolean /*  */;
  mergeWithParent: boolean /*  */;
  isLocalizable: boolean /*  */;
}
class ClsParam extends BaseParam {
  get typeTag(): 'Param' {
    return 'Param';
  }
}
export const Param = ClsParam;

type KnownArg = ClsArg;
export function isKnownArg<T>(
  x: [Extract<T, Arg>] extends [never] ? never : T,
): x is [Extract<T, Arg>] extends [never]
  ? never
  : Arg extends T // Needed when T is any
  ? Arg
  : Extract<T, Arg> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseArg;
}
export function isExactlyArg(x: any): x is Arg {
  return x?.['typeTag'] === 'Arg';
}

export function ensureKnownArg<T>(
  x: [Extract<T, Arg>] extends [never] ? never : T,
): Arg {
  assert(isKnownArg(x), () => mkUnexpectedTypeMsg([Arg], x));
  return x;
}
export function ensureMaybeKnownArg<T>(
  x: [Extract<T, Arg>] extends [never] ? never : T,
): Arg | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownArg(x);
}

export type Arg = KnownArg;
export interface ArgParams {
  param: Param /* WeakRef */;
  expr: Expr /*  */;
}

abstract class BaseArg extends BaseBindingStruct {
  static isKnown(x: any): x is Arg {
    return isKnownArg(x);
  }
  static getType(): Arg {
    throw new Error();
  }
  static modelTypeName = 'Arg';

  constructor(args: ArgParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.Arg(this, args);
    }
  }
  uid: number;
  param: Param /* WeakRef */;
  expr: Expr /*  */;
}
class ClsArg extends BaseArg {
  get typeTag(): 'Arg' {
    return 'Arg';
  }
}
export const Arg = ClsArg;

type KnownExpr =
  | KnownRenderExpr
  | KnownCustomCode
  | KnownDataSourceOpExpr
  | KnownVarRef
  | KnownTplRef
  | KnownStyleTokenRef
  | KnownImageAssetRef
  | KnownPageHref
  | KnownVariantsRef
  | KnownObjectPath
  | KnownEventHandler
  | KnownFunctionArg
  | KnownCollectionExpr
  | KnownMapExpr
  | KnownStyleExpr
  | KnownTemplatedString
  | KnownFunctionExpr
  | KnownQueryInvalidationExpr
  | KnownCompositeExpr;
export function isKnownExpr<T>(
  x: [Extract<T, Expr>] extends [never] ? never : T,
): x is [Extract<T, Expr>] extends [never]
  ? never
  : Expr extends T // Needed when T is any
  ? Expr
  : Extract<T, Expr> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseExpr;
}

export function ensureKnownExpr<T>(
  x: [Extract<T, Expr>] extends [never] ? never : T,
): Expr {
  assert(isKnownExpr(x), () => mkUnexpectedTypeMsg([Expr], x));
  return x;
}
export function ensureMaybeKnownExpr<T>(
  x: [Extract<T, Expr>] extends [never] ? never : T,
): Expr | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownExpr(x);
}

export type Expr = KnownExpr;
export interface ExprParams {}

abstract class BaseExpr {
  static isKnown(x: any): x is Expr {
    return isKnownExpr(x);
  }
  static getType(): Expr {
    throw new Error();
  }
  static modelTypeName = 'Expr';

  constructor(args: ExprParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.Expr(this, args);
    }
  }
  uid: number;
}

export const Expr = BaseExpr;

type KnownRenderExpr = KnownVirtualRenderExpr | ClsRenderExpr;
export function isKnownRenderExpr<T>(
  x: [Extract<T, RenderExpr>] extends [never] ? never : T,
): x is [Extract<T, RenderExpr>] extends [never]
  ? never
  : RenderExpr extends T // Needed when T is any
  ? RenderExpr
  : Extract<T, RenderExpr> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseRenderExpr;
}
export function isExactlyRenderExpr(x: any): x is RenderExpr {
  return x?.['typeTag'] === 'RenderExpr';
}

export function ensureKnownRenderExpr<T>(
  x: [Extract<T, RenderExpr>] extends [never] ? never : T,
): RenderExpr {
  assert(isKnownRenderExpr(x), () => mkUnexpectedTypeMsg([RenderExpr], x));
  return x;
}
export function ensureMaybeKnownRenderExpr<T>(
  x: [Extract<T, RenderExpr>] extends [never] ? never : T,
): RenderExpr | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownRenderExpr(x);
}

export type RenderExpr = KnownRenderExpr;
export interface RenderExprParams {
  tpl: Array<TplNode> /*  */;
}

abstract class BaseRenderExpr extends BaseExpr {
  static isKnown(x: any): x is RenderExpr {
    return isKnownRenderExpr(x);
  }
  static getType(): RenderExpr {
    throw new Error();
  }
  static modelTypeName = 'RenderExpr';

  constructor(args: RenderExprParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.RenderExpr(this, args);
    }
  }
  uid: number;
  tpl: Array<TplNode> /*  */;
}
class ClsRenderExpr extends BaseRenderExpr {
  get typeTag(): 'RenderExpr' {
    return 'RenderExpr';
  }
}
export const RenderExpr = ClsRenderExpr;

type KnownVirtualRenderExpr = ClsVirtualRenderExpr;
export function isKnownVirtualRenderExpr<T>(
  x: [Extract<T, VirtualRenderExpr>] extends [never] ? never : T,
): x is [Extract<T, VirtualRenderExpr>] extends [never]
  ? never
  : VirtualRenderExpr extends T // Needed when T is any
  ? VirtualRenderExpr
  : Extract<T, VirtualRenderExpr> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseVirtualRenderExpr;
}
export function isExactlyVirtualRenderExpr(x: any): x is VirtualRenderExpr {
  return x?.['typeTag'] === 'VirtualRenderExpr';
}

export function ensureKnownVirtualRenderExpr<T>(
  x: [Extract<T, VirtualRenderExpr>] extends [never] ? never : T,
): VirtualRenderExpr {
  assert(isKnownVirtualRenderExpr(x), () =>
    mkUnexpectedTypeMsg([VirtualRenderExpr], x),
  );
  return x;
}
export function ensureMaybeKnownVirtualRenderExpr<T>(
  x: [Extract<T, VirtualRenderExpr>] extends [never] ? never : T,
): VirtualRenderExpr | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownVirtualRenderExpr(x);
}

export type VirtualRenderExpr = KnownVirtualRenderExpr;
export interface VirtualRenderExprParams {
  tpl: Array<TplNode> /*  */;
}

abstract class BaseVirtualRenderExpr extends BaseRenderExpr {
  static isKnown(x: any): x is VirtualRenderExpr {
    return isKnownVirtualRenderExpr(x);
  }
  static getType(): VirtualRenderExpr {
    throw new Error();
  }
  static modelTypeName = 'VirtualRenderExpr';

  constructor(args: VirtualRenderExprParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.VirtualRenderExpr(this, args);
    }
  }
  uid: number;
  tpl: Array<TplNode> /*  */;
}
class ClsVirtualRenderExpr extends BaseVirtualRenderExpr {
  get typeTag(): 'VirtualRenderExpr' {
    return 'VirtualRenderExpr';
  }
}
export const VirtualRenderExpr = ClsVirtualRenderExpr;

type KnownCustomCode = ClsCustomCode;
export function isKnownCustomCode<T>(
  x: [Extract<T, CustomCode>] extends [never] ? never : T,
): x is [Extract<T, CustomCode>] extends [never]
  ? never
  : CustomCode extends T // Needed when T is any
  ? CustomCode
  : Extract<T, CustomCode> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseCustomCode;
}
export function isExactlyCustomCode(x: any): x is CustomCode {
  return x?.['typeTag'] === 'CustomCode';
}

export function ensureKnownCustomCode<T>(
  x: [Extract<T, CustomCode>] extends [never] ? never : T,
): CustomCode {
  assert(isKnownCustomCode(x), () => mkUnexpectedTypeMsg([CustomCode], x));
  return x;
}
export function ensureMaybeKnownCustomCode<T>(
  x: [Extract<T, CustomCode>] extends [never] ? never : T,
): CustomCode | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownCustomCode(x);
}

export type CustomCode = KnownCustomCode;
export interface CustomCodeParams {
  code: string /*  */;
  fallback: Expr | null | undefined /*  */;
}

abstract class BaseCustomCode extends BaseExpr {
  static isKnown(x: any): x is CustomCode {
    return isKnownCustomCode(x);
  }
  static getType(): CustomCode {
    throw new Error();
  }
  static modelTypeName = 'CustomCode';

  constructor(args: CustomCodeParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.CustomCode(this, args);
    }
  }
  uid: number;
  code: string /*  */;
  fallback: Expr | null | undefined /*  */;
}
class ClsCustomCode extends BaseCustomCode {
  get typeTag(): 'CustomCode' {
    return 'CustomCode';
  }
}
export const CustomCode = ClsCustomCode;

type KnownDataSourceOpExpr = ClsDataSourceOpExpr;
export function isKnownDataSourceOpExpr<T>(
  x: [Extract<T, DataSourceOpExpr>] extends [never] ? never : T,
): x is [Extract<T, DataSourceOpExpr>] extends [never]
  ? never
  : DataSourceOpExpr extends T // Needed when T is any
  ? DataSourceOpExpr
  : Extract<T, DataSourceOpExpr> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseDataSourceOpExpr;
}
export function isExactlyDataSourceOpExpr(x: any): x is DataSourceOpExpr {
  return x?.['typeTag'] === 'DataSourceOpExpr';
}

export function ensureKnownDataSourceOpExpr<T>(
  x: [Extract<T, DataSourceOpExpr>] extends [never] ? never : T,
): DataSourceOpExpr {
  assert(isKnownDataSourceOpExpr(x), () =>
    mkUnexpectedTypeMsg([DataSourceOpExpr], x),
  );
  return x;
}
export function ensureMaybeKnownDataSourceOpExpr<T>(
  x: [Extract<T, DataSourceOpExpr>] extends [never] ? never : T,
): DataSourceOpExpr | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownDataSourceOpExpr(x);
}

export type DataSourceOpExpr = KnownDataSourceOpExpr;
export interface DataSourceOpExprParams {
  parent: QueryRef | null | undefined /*  */;
  sourceId: string /*  */;
  opId: string /*  */;
  opName: string /*  */;
  templates: {[key: string]: DataSourceTemplate} /*  */;
  cacheKey: TemplatedString | null | undefined /*  */;
  queryInvalidation: QueryInvalidationExpr | null | undefined /*  */;
  roleId: string | null | undefined /*  */;
}

abstract class BaseDataSourceOpExpr extends BaseExpr {
  static isKnown(x: any): x is DataSourceOpExpr {
    return isKnownDataSourceOpExpr(x);
  }
  static getType(): DataSourceOpExpr {
    throw new Error();
  }
  static modelTypeName = 'DataSourceOpExpr';

  constructor(args: DataSourceOpExprParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.DataSourceOpExpr(this, args);
    }
  }
  uid: number;
  parent: QueryRef | null | undefined /*  */;
  sourceId: string /*  */;
  opId: string /*  */;
  opName: string /*  */;
  templates: {[key: string]: DataSourceTemplate} /*  */;
  cacheKey: TemplatedString | null | undefined /*  */;
  queryInvalidation: QueryInvalidationExpr | null | undefined /*  */;
  roleId: string | null | undefined /*  */;
}
class ClsDataSourceOpExpr extends BaseDataSourceOpExpr {
  get typeTag(): 'DataSourceOpExpr' {
    return 'DataSourceOpExpr';
  }
}
export const DataSourceOpExpr = ClsDataSourceOpExpr;

type KnownVarRef = ClsVarRef;
export function isKnownVarRef<T>(
  x: [Extract<T, VarRef>] extends [never] ? never : T,
): x is [Extract<T, VarRef>] extends [never]
  ? never
  : VarRef extends T // Needed when T is any
  ? VarRef
  : Extract<T, VarRef> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseVarRef;
}
export function isExactlyVarRef(x: any): x is VarRef {
  return x?.['typeTag'] === 'VarRef';
}

export function ensureKnownVarRef<T>(
  x: [Extract<T, VarRef>] extends [never] ? never : T,
): VarRef {
  assert(isKnownVarRef(x), () => mkUnexpectedTypeMsg([VarRef], x));
  return x;
}
export function ensureMaybeKnownVarRef<T>(
  x: [Extract<T, VarRef>] extends [never] ? never : T,
): VarRef | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownVarRef(x);
}

export type VarRef = KnownVarRef;
export interface VarRefParams {
  variable: Var /* WeakRef */;
}

abstract class BaseVarRef extends BaseExpr {
  static isKnown(x: any): x is VarRef {
    return isKnownVarRef(x);
  }
  static getType(): VarRef {
    throw new Error();
  }
  static modelTypeName = 'VarRef';

  constructor(args: VarRefParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.VarRef(this, args);
    }
  }
  uid: number;
  variable: Var /* WeakRef */;
}
class ClsVarRef extends BaseVarRef {
  get typeTag(): 'VarRef' {
    return 'VarRef';
  }
}
export const VarRef = ClsVarRef;

type KnownTplRef = ClsTplRef;
export function isKnownTplRef<T>(
  x: [Extract<T, TplRef>] extends [never] ? never : T,
): x is [Extract<T, TplRef>] extends [never]
  ? never
  : TplRef extends T // Needed when T is any
  ? TplRef
  : Extract<T, TplRef> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseTplRef;
}
export function isExactlyTplRef(x: any): x is TplRef {
  return x?.['typeTag'] === 'TplRef';
}

export function ensureKnownTplRef<T>(
  x: [Extract<T, TplRef>] extends [never] ? never : T,
): TplRef {
  assert(isKnownTplRef(x), () => mkUnexpectedTypeMsg([TplRef], x));
  return x;
}
export function ensureMaybeKnownTplRef<T>(
  x: [Extract<T, TplRef>] extends [never] ? never : T,
): TplRef | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownTplRef(x);
}

export type TplRef = KnownTplRef;
export interface TplRefParams {
  tpl: TplNode /* WeakRef */;
}

abstract class BaseTplRef extends BaseExpr {
  static isKnown(x: any): x is TplRef {
    return isKnownTplRef(x);
  }
  static getType(): TplRef {
    throw new Error();
  }
  static modelTypeName = 'TplRef';

  constructor(args: TplRefParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.TplRef(this, args);
    }
  }
  uid: number;
  tpl: TplNode /* WeakRef */;
}
class ClsTplRef extends BaseTplRef {
  get typeTag(): 'TplRef' {
    return 'TplRef';
  }
}
export const TplRef = ClsTplRef;

type KnownStyleTokenRef = ClsStyleTokenRef;
export function isKnownStyleTokenRef<T>(
  x: [Extract<T, StyleTokenRef>] extends [never] ? never : T,
): x is [Extract<T, StyleTokenRef>] extends [never]
  ? never
  : StyleTokenRef extends T // Needed when T is any
  ? StyleTokenRef
  : Extract<T, StyleTokenRef> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseStyleTokenRef;
}
export function isExactlyStyleTokenRef(x: any): x is StyleTokenRef {
  return x?.['typeTag'] === 'StyleTokenRef';
}

export function ensureKnownStyleTokenRef<T>(
  x: [Extract<T, StyleTokenRef>] extends [never] ? never : T,
): StyleTokenRef {
  assert(isKnownStyleTokenRef(x), () =>
    mkUnexpectedTypeMsg([StyleTokenRef], x),
  );
  return x;
}
export function ensureMaybeKnownStyleTokenRef<T>(
  x: [Extract<T, StyleTokenRef>] extends [never] ? never : T,
): StyleTokenRef | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownStyleTokenRef(x);
}

export type StyleTokenRef = KnownStyleTokenRef;
export interface StyleTokenRefParams {
  token: StyleToken /* WeakRef */;
}

abstract class BaseStyleTokenRef extends BaseExpr {
  static isKnown(x: any): x is StyleTokenRef {
    return isKnownStyleTokenRef(x);
  }
  static getType(): StyleTokenRef {
    throw new Error();
  }
  static modelTypeName = 'StyleTokenRef';

  constructor(args: StyleTokenRefParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.StyleTokenRef(this, args);
    }
  }
  uid: number;
  token: StyleToken /* WeakRef */;
}
class ClsStyleTokenRef extends BaseStyleTokenRef {
  get typeTag(): 'StyleTokenRef' {
    return 'StyleTokenRef';
  }
}
export const StyleTokenRef = ClsStyleTokenRef;

type KnownImageAssetRef = ClsImageAssetRef;
export function isKnownImageAssetRef<T>(
  x: [Extract<T, ImageAssetRef>] extends [never] ? never : T,
): x is [Extract<T, ImageAssetRef>] extends [never]
  ? never
  : ImageAssetRef extends T // Needed when T is any
  ? ImageAssetRef
  : Extract<T, ImageAssetRef> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseImageAssetRef;
}
export function isExactlyImageAssetRef(x: any): x is ImageAssetRef {
  return x?.['typeTag'] === 'ImageAssetRef';
}

export function ensureKnownImageAssetRef<T>(
  x: [Extract<T, ImageAssetRef>] extends [never] ? never : T,
): ImageAssetRef {
  assert(isKnownImageAssetRef(x), () =>
    mkUnexpectedTypeMsg([ImageAssetRef], x),
  );
  return x;
}
export function ensureMaybeKnownImageAssetRef<T>(
  x: [Extract<T, ImageAssetRef>] extends [never] ? never : T,
): ImageAssetRef | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownImageAssetRef(x);
}

export type ImageAssetRef = KnownImageAssetRef;
export interface ImageAssetRefParams {
  asset: ImageAsset /* WeakRef */;
}

abstract class BaseImageAssetRef extends BaseExpr {
  static isKnown(x: any): x is ImageAssetRef {
    return isKnownImageAssetRef(x);
  }
  static getType(): ImageAssetRef {
    throw new Error();
  }
  static modelTypeName = 'ImageAssetRef';

  constructor(args: ImageAssetRefParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.ImageAssetRef(this, args);
    }
  }
  uid: number;
  asset: ImageAsset /* WeakRef */;
}
class ClsImageAssetRef extends BaseImageAssetRef {
  get typeTag(): 'ImageAssetRef' {
    return 'ImageAssetRef';
  }
}
export const ImageAssetRef = ClsImageAssetRef;

type KnownPageHref = ClsPageHref;
export function isKnownPageHref<T>(
  x: [Extract<T, PageHref>] extends [never] ? never : T,
): x is [Extract<T, PageHref>] extends [never]
  ? never
  : PageHref extends T // Needed when T is any
  ? PageHref
  : Extract<T, PageHref> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BasePageHref;
}
export function isExactlyPageHref(x: any): x is PageHref {
  return x?.['typeTag'] === 'PageHref';
}

export function ensureKnownPageHref<T>(
  x: [Extract<T, PageHref>] extends [never] ? never : T,
): PageHref {
  assert(isKnownPageHref(x), () => mkUnexpectedTypeMsg([PageHref], x));
  return x;
}
export function ensureMaybeKnownPageHref<T>(
  x: [Extract<T, PageHref>] extends [never] ? never : T,
): PageHref | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownPageHref(x);
}

export type PageHref = KnownPageHref;
export interface PageHrefParams {
  page: Component /* WeakRef */;
  params: {[key: string]: Expr} /*  */;
}

abstract class BasePageHref extends BaseExpr {
  static isKnown(x: any): x is PageHref {
    return isKnownPageHref(x);
  }
  static getType(): PageHref {
    throw new Error();
  }
  static modelTypeName = 'PageHref';

  constructor(args: PageHrefParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.PageHref(this, args);
    }
  }
  uid: number;
  page: Component /* WeakRef */;
  params: {[key: string]: Expr} /*  */;
}
class ClsPageHref extends BasePageHref {
  get typeTag(): 'PageHref' {
    return 'PageHref';
  }
}
export const PageHref = ClsPageHref;

type KnownVariantsRef = ClsVariantsRef;
export function isKnownVariantsRef<T>(
  x: [Extract<T, VariantsRef>] extends [never] ? never : T,
): x is [Extract<T, VariantsRef>] extends [never]
  ? never
  : VariantsRef extends T // Needed when T is any
  ? VariantsRef
  : Extract<T, VariantsRef> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseVariantsRef;
}
export function isExactlyVariantsRef(x: any): x is VariantsRef {
  return x?.['typeTag'] === 'VariantsRef';
}

export function ensureKnownVariantsRef<T>(
  x: [Extract<T, VariantsRef>] extends [never] ? never : T,
): VariantsRef {
  assert(isKnownVariantsRef(x), () => mkUnexpectedTypeMsg([VariantsRef], x));
  return x;
}
export function ensureMaybeKnownVariantsRef<T>(
  x: [Extract<T, VariantsRef>] extends [never] ? never : T,
): VariantsRef | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownVariantsRef(x);
}

export type VariantsRef = KnownVariantsRef;
export interface VariantsRefParams {
  variants: Array<Variant> /* WeakRef */;
}

abstract class BaseVariantsRef extends BaseExpr {
  static isKnown(x: any): x is VariantsRef {
    return isKnownVariantsRef(x);
  }
  static getType(): VariantsRef {
    throw new Error();
  }
  static modelTypeName = 'VariantsRef';

  constructor(args: VariantsRefParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.VariantsRef(this, args);
    }
  }
  uid: number;
  variants: Array<Variant> /* WeakRef */;
}
class ClsVariantsRef extends BaseVariantsRef {
  get typeTag(): 'VariantsRef' {
    return 'VariantsRef';
  }
}
export const VariantsRef = ClsVariantsRef;

type KnownObjectPath = ClsObjectPath;
export function isKnownObjectPath<T>(
  x: [Extract<T, ObjectPath>] extends [never] ? never : T,
): x is [Extract<T, ObjectPath>] extends [never]
  ? never
  : ObjectPath extends T // Needed when T is any
  ? ObjectPath
  : Extract<T, ObjectPath> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseObjectPath;
}
export function isExactlyObjectPath(x: any): x is ObjectPath {
  return x?.['typeTag'] === 'ObjectPath';
}

export function ensureKnownObjectPath<T>(
  x: [Extract<T, ObjectPath>] extends [never] ? never : T,
): ObjectPath {
  assert(isKnownObjectPath(x), () => mkUnexpectedTypeMsg([ObjectPath], x));
  return x;
}
export function ensureMaybeKnownObjectPath<T>(
  x: [Extract<T, ObjectPath>] extends [never] ? never : T,
): ObjectPath | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownObjectPath(x);
}

export type ObjectPath = KnownObjectPath;
export interface ObjectPathParams {
  path: Array<string | number> /*  */;
  fallback: Expr | null | undefined /*  */;
}

abstract class BaseObjectPath extends BaseExpr {
  static isKnown(x: any): x is ObjectPath {
    return isKnownObjectPath(x);
  }
  static getType(): ObjectPath {
    throw new Error();
  }
  static modelTypeName = 'ObjectPath';

  constructor(args: ObjectPathParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.ObjectPath(this, args);
    }
  }
  uid: number;
  path: Array<string | number> /*  */;
  fallback: Expr | null | undefined /*  */;
}
class ClsObjectPath extends BaseObjectPath {
  get typeTag(): 'ObjectPath' {
    return 'ObjectPath';
  }
}
export const ObjectPath = ClsObjectPath;

type KnownEventHandler = KnownGenericEventHandler | ClsEventHandler;
export function isKnownEventHandler<T>(
  x: [Extract<T, EventHandler>] extends [never] ? never : T,
): x is [Extract<T, EventHandler>] extends [never]
  ? never
  : EventHandler extends T // Needed when T is any
  ? EventHandler
  : Extract<T, EventHandler> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseEventHandler;
}
export function isExactlyEventHandler(x: any): x is EventHandler {
  return x?.['typeTag'] === 'EventHandler';
}

export function ensureKnownEventHandler<T>(
  x: [Extract<T, EventHandler>] extends [never] ? never : T,
): EventHandler {
  assert(isKnownEventHandler(x), () => mkUnexpectedTypeMsg([EventHandler], x));
  return x;
}
export function ensureMaybeKnownEventHandler<T>(
  x: [Extract<T, EventHandler>] extends [never] ? never : T,
): EventHandler | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownEventHandler(x);
}

export type EventHandler = KnownEventHandler;
export interface EventHandlerParams {
  interactions: Array<Interaction> /*  */;
}

abstract class BaseEventHandler extends BaseExpr {
  static isKnown(x: any): x is EventHandler {
    return isKnownEventHandler(x);
  }
  static getType(): EventHandler {
    throw new Error();
  }
  static modelTypeName = 'EventHandler';

  constructor(args: EventHandlerParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.EventHandler(this, args);
    }
  }
  uid: number;
  interactions: Array<Interaction> /*  */;
}
class ClsEventHandler extends BaseEventHandler {
  get typeTag(): 'EventHandler' {
    return 'EventHandler';
  }
}
export const EventHandler = ClsEventHandler;

type KnownGenericEventHandler = ClsGenericEventHandler;
export function isKnownGenericEventHandler<T>(
  x: [Extract<T, GenericEventHandler>] extends [never] ? never : T,
): x is [Extract<T, GenericEventHandler>] extends [never]
  ? never
  : GenericEventHandler extends T // Needed when T is any
  ? GenericEventHandler
  : Extract<T, GenericEventHandler> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseGenericEventHandler;
}
export function isExactlyGenericEventHandler(x: any): x is GenericEventHandler {
  return x?.['typeTag'] === 'GenericEventHandler';
}

export function ensureKnownGenericEventHandler<T>(
  x: [Extract<T, GenericEventHandler>] extends [never] ? never : T,
): GenericEventHandler {
  assert(isKnownGenericEventHandler(x), () =>
    mkUnexpectedTypeMsg([GenericEventHandler], x),
  );
  return x;
}
export function ensureMaybeKnownGenericEventHandler<T>(
  x: [Extract<T, GenericEventHandler>] extends [never] ? never : T,
): GenericEventHandler | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownGenericEventHandler(x);
}

export type GenericEventHandler = KnownGenericEventHandler;
export interface GenericEventHandlerParams {
  handlerType: FunctionType /*  */;
  interactions: Array<Interaction> /*  */;
}

abstract class BaseGenericEventHandler extends BaseEventHandler {
  static isKnown(x: any): x is GenericEventHandler {
    return isKnownGenericEventHandler(x);
  }
  static getType(): GenericEventHandler {
    throw new Error();
  }
  static modelTypeName = 'GenericEventHandler';

  constructor(args: GenericEventHandlerParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.GenericEventHandler(this, args);
    }
  }
  uid: number;
  handlerType: FunctionType /*  */;
  interactions: Array<Interaction> /*  */;
}
class ClsGenericEventHandler extends BaseGenericEventHandler {
  get typeTag(): 'GenericEventHandler' {
    return 'GenericEventHandler';
  }
}
export const GenericEventHandler = ClsGenericEventHandler;

type KnownFunctionArg = KnownStrongFunctionArg | ClsFunctionArg;
export function isKnownFunctionArg<T>(
  x: [Extract<T, FunctionArg>] extends [never] ? never : T,
): x is [Extract<T, FunctionArg>] extends [never]
  ? never
  : FunctionArg extends T // Needed when T is any
  ? FunctionArg
  : Extract<T, FunctionArg> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseFunctionArg;
}
export function isExactlyFunctionArg(x: any): x is FunctionArg {
  return x?.['typeTag'] === 'FunctionArg';
}

export function ensureKnownFunctionArg<T>(
  x: [Extract<T, FunctionArg>] extends [never] ? never : T,
): FunctionArg {
  assert(isKnownFunctionArg(x), () => mkUnexpectedTypeMsg([FunctionArg], x));
  return x;
}
export function ensureMaybeKnownFunctionArg<T>(
  x: [Extract<T, FunctionArg>] extends [never] ? never : T,
): FunctionArg | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownFunctionArg(x);
}

export type FunctionArg = KnownFunctionArg;
export interface FunctionArgParams {
  readonly uuid: string /* Const */;
  argType: ArgType /* WeakRef */;
  expr: Expr /*  */;
}

abstract class BaseFunctionArg extends BaseExpr {
  static isKnown(x: any): x is FunctionArg {
    return isKnownFunctionArg(x);
  }
  static getType(): FunctionArg {
    throw new Error();
  }
  static modelTypeName = 'FunctionArg';

  constructor(args: FunctionArgParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.FunctionArg(this, args);
    }
  }
  uid: number;
  readonly uuid: string /* Const */;
  argType: ArgType /* WeakRef */;
  expr: Expr /*  */;
}
class ClsFunctionArg extends BaseFunctionArg {
  get typeTag(): 'FunctionArg' {
    return 'FunctionArg';
  }
}
export const FunctionArg = ClsFunctionArg;

type KnownStrongFunctionArg = ClsStrongFunctionArg;
export function isKnownStrongFunctionArg<T>(
  x: [Extract<T, StrongFunctionArg>] extends [never] ? never : T,
): x is [Extract<T, StrongFunctionArg>] extends [never]
  ? never
  : StrongFunctionArg extends T // Needed when T is any
  ? StrongFunctionArg
  : Extract<T, StrongFunctionArg> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseStrongFunctionArg;
}
export function isExactlyStrongFunctionArg(x: any): x is StrongFunctionArg {
  return x?.['typeTag'] === 'StrongFunctionArg';
}

export function ensureKnownStrongFunctionArg<T>(
  x: [Extract<T, StrongFunctionArg>] extends [never] ? never : T,
): StrongFunctionArg {
  assert(isKnownStrongFunctionArg(x), () =>
    mkUnexpectedTypeMsg([StrongFunctionArg], x),
  );
  return x;
}
export function ensureMaybeKnownStrongFunctionArg<T>(
  x: [Extract<T, StrongFunctionArg>] extends [never] ? never : T,
): StrongFunctionArg | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownStrongFunctionArg(x);
}

export type StrongFunctionArg = KnownStrongFunctionArg;
export interface StrongFunctionArgParams {
  argType: ArgType /*  */;
  readonly uuid: string /* Const */;
  expr: Expr /*  */;
}

abstract class BaseStrongFunctionArg extends BaseFunctionArg {
  static isKnown(x: any): x is StrongFunctionArg {
    return isKnownStrongFunctionArg(x);
  }
  static getType(): StrongFunctionArg {
    throw new Error();
  }
  static modelTypeName = 'StrongFunctionArg';

  constructor(args: StrongFunctionArgParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.StrongFunctionArg(this, args);
    }
  }
  uid: number;
  argType: ArgType /*  */;
  readonly uuid: string /* Const */;
  expr: Expr /*  */;
}
class ClsStrongFunctionArg extends BaseStrongFunctionArg {
  get typeTag(): 'StrongFunctionArg' {
    return 'StrongFunctionArg';
  }
}
export const StrongFunctionArg = ClsStrongFunctionArg;

type KnownCollectionExpr = ClsCollectionExpr;
export function isKnownCollectionExpr<T>(
  x: [Extract<T, CollectionExpr>] extends [never] ? never : T,
): x is [Extract<T, CollectionExpr>] extends [never]
  ? never
  : CollectionExpr extends T // Needed when T is any
  ? CollectionExpr
  : Extract<T, CollectionExpr> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseCollectionExpr;
}
export function isExactlyCollectionExpr(x: any): x is CollectionExpr {
  return x?.['typeTag'] === 'CollectionExpr';
}

export function ensureKnownCollectionExpr<T>(
  x: [Extract<T, CollectionExpr>] extends [never] ? never : T,
): CollectionExpr {
  assert(isKnownCollectionExpr(x), () =>
    mkUnexpectedTypeMsg([CollectionExpr], x),
  );
  return x;
}
export function ensureMaybeKnownCollectionExpr<T>(
  x: [Extract<T, CollectionExpr>] extends [never] ? never : T,
): CollectionExpr | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownCollectionExpr(x);
}

export type CollectionExpr = KnownCollectionExpr;
export interface CollectionExprParams {
  exprs: Array<Expr> /*  */;
}

abstract class BaseCollectionExpr extends BaseExpr {
  static isKnown(x: any): x is CollectionExpr {
    return isKnownCollectionExpr(x);
  }
  static getType(): CollectionExpr {
    throw new Error();
  }
  static modelTypeName = 'CollectionExpr';

  constructor(args: CollectionExprParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.CollectionExpr(this, args);
    }
  }
  uid: number;
  exprs: Array<Expr> /*  */;
}
class ClsCollectionExpr extends BaseCollectionExpr {
  get typeTag(): 'CollectionExpr' {
    return 'CollectionExpr';
  }
}
export const CollectionExpr = ClsCollectionExpr;

type KnownMapExpr = ClsMapExpr;
export function isKnownMapExpr<T>(
  x: [Extract<T, MapExpr>] extends [never] ? never : T,
): x is [Extract<T, MapExpr>] extends [never]
  ? never
  : MapExpr extends T // Needed when T is any
  ? MapExpr
  : Extract<T, MapExpr> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseMapExpr;
}
export function isExactlyMapExpr(x: any): x is MapExpr {
  return x?.['typeTag'] === 'MapExpr';
}

export function ensureKnownMapExpr<T>(
  x: [Extract<T, MapExpr>] extends [never] ? never : T,
): MapExpr {
  assert(isKnownMapExpr(x), () => mkUnexpectedTypeMsg([MapExpr], x));
  return x;
}
export function ensureMaybeKnownMapExpr<T>(
  x: [Extract<T, MapExpr>] extends [never] ? never : T,
): MapExpr | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownMapExpr(x);
}

export type MapExpr = KnownMapExpr;
export interface MapExprParams {
  mapExpr: {[key: string]: Expr} /*  */;
}

abstract class BaseMapExpr extends BaseExpr {
  static isKnown(x: any): x is MapExpr {
    return isKnownMapExpr(x);
  }
  static getType(): MapExpr {
    throw new Error();
  }
  static modelTypeName = 'MapExpr';

  constructor(args: MapExprParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.MapExpr(this, args);
    }
  }
  uid: number;
  mapExpr: {[key: string]: Expr} /*  */;
}
class ClsMapExpr extends BaseMapExpr {
  get typeTag(): 'MapExpr' {
    return 'MapExpr';
  }
}
export const MapExpr = ClsMapExpr;

type KnownStyleExpr = ClsStyleExpr;
export function isKnownStyleExpr<T>(
  x: [Extract<T, StyleExpr>] extends [never] ? never : T,
): x is [Extract<T, StyleExpr>] extends [never]
  ? never
  : StyleExpr extends T // Needed when T is any
  ? StyleExpr
  : Extract<T, StyleExpr> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseStyleExpr;
}
export function isExactlyStyleExpr(x: any): x is StyleExpr {
  return x?.['typeTag'] === 'StyleExpr';
}

export function ensureKnownStyleExpr<T>(
  x: [Extract<T, StyleExpr>] extends [never] ? never : T,
): StyleExpr {
  assert(isKnownStyleExpr(x), () => mkUnexpectedTypeMsg([StyleExpr], x));
  return x;
}
export function ensureMaybeKnownStyleExpr<T>(
  x: [Extract<T, StyleExpr>] extends [never] ? never : T,
): StyleExpr | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownStyleExpr(x);
}

export type StyleExpr = KnownStyleExpr;
export interface StyleExprParams {
  uuid: string /*  */;
  styles: Array<SelectorRuleSet> /*  */;
}

abstract class BaseStyleExpr extends BaseExpr {
  static isKnown(x: any): x is StyleExpr {
    return isKnownStyleExpr(x);
  }
  static getType(): StyleExpr {
    throw new Error();
  }
  static modelTypeName = 'StyleExpr';

  constructor(args: StyleExprParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.StyleExpr(this, args);
    }
  }
  uid: number;
  uuid: string /*  */;
  styles: Array<SelectorRuleSet> /*  */;
}
class ClsStyleExpr extends BaseStyleExpr {
  get typeTag(): 'StyleExpr' {
    return 'StyleExpr';
  }
}
export const StyleExpr = ClsStyleExpr;

type KnownTemplatedString = ClsTemplatedString;
export function isKnownTemplatedString<T>(
  x: [Extract<T, TemplatedString>] extends [never] ? never : T,
): x is [Extract<T, TemplatedString>] extends [never]
  ? never
  : TemplatedString extends T // Needed when T is any
  ? TemplatedString
  : Extract<T, TemplatedString> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseTemplatedString;
}
export function isExactlyTemplatedString(x: any): x is TemplatedString {
  return x?.['typeTag'] === 'TemplatedString';
}

export function ensureKnownTemplatedString<T>(
  x: [Extract<T, TemplatedString>] extends [never] ? never : T,
): TemplatedString {
  assert(isKnownTemplatedString(x), () =>
    mkUnexpectedTypeMsg([TemplatedString], x),
  );
  return x;
}
export function ensureMaybeKnownTemplatedString<T>(
  x: [Extract<T, TemplatedString>] extends [never] ? never : T,
): TemplatedString | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownTemplatedString(x);
}

export type TemplatedString = KnownTemplatedString;
export interface TemplatedStringParams {
  text: Array<string | ObjectPath | CustomCode> /*  */;
}

abstract class BaseTemplatedString extends BaseExpr {
  static isKnown(x: any): x is TemplatedString {
    return isKnownTemplatedString(x);
  }
  static getType(): TemplatedString {
    throw new Error();
  }
  static modelTypeName = 'TemplatedString';

  constructor(args: TemplatedStringParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.TemplatedString(this, args);
    }
  }
  uid: number;
  text: Array<string | ObjectPath | CustomCode> /*  */;
}
class ClsTemplatedString extends BaseTemplatedString {
  get typeTag(): 'TemplatedString' {
    return 'TemplatedString';
  }
}
export const TemplatedString = ClsTemplatedString;

type KnownFunctionExpr = ClsFunctionExpr;
export function isKnownFunctionExpr<T>(
  x: [Extract<T, FunctionExpr>] extends [never] ? never : T,
): x is [Extract<T, FunctionExpr>] extends [never]
  ? never
  : FunctionExpr extends T // Needed when T is any
  ? FunctionExpr
  : Extract<T, FunctionExpr> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseFunctionExpr;
}
export function isExactlyFunctionExpr(x: any): x is FunctionExpr {
  return x?.['typeTag'] === 'FunctionExpr';
}

export function ensureKnownFunctionExpr<T>(
  x: [Extract<T, FunctionExpr>] extends [never] ? never : T,
): FunctionExpr {
  assert(isKnownFunctionExpr(x), () => mkUnexpectedTypeMsg([FunctionExpr], x));
  return x;
}
export function ensureMaybeKnownFunctionExpr<T>(
  x: [Extract<T, FunctionExpr>] extends [never] ? never : T,
): FunctionExpr | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownFunctionExpr(x);
}

export type FunctionExpr = KnownFunctionExpr;
export interface FunctionExprParams {
  argNames: Array<string> /*  */;
  bodyExpr: Expr /*  */;
}

abstract class BaseFunctionExpr extends BaseExpr {
  static isKnown(x: any): x is FunctionExpr {
    return isKnownFunctionExpr(x);
  }
  static getType(): FunctionExpr {
    throw new Error();
  }
  static modelTypeName = 'FunctionExpr';

  constructor(args: FunctionExprParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.FunctionExpr(this, args);
    }
  }
  uid: number;
  argNames: Array<string> /*  */;
  bodyExpr: Expr /*  */;
}
class ClsFunctionExpr extends BaseFunctionExpr {
  get typeTag(): 'FunctionExpr' {
    return 'FunctionExpr';
  }
}
export const FunctionExpr = ClsFunctionExpr;

type KnownQueryInvalidationExpr = ClsQueryInvalidationExpr;
export function isKnownQueryInvalidationExpr<T>(
  x: [Extract<T, QueryInvalidationExpr>] extends [never] ? never : T,
): x is [Extract<T, QueryInvalidationExpr>] extends [never]
  ? never
  : QueryInvalidationExpr extends T // Needed when T is any
  ? QueryInvalidationExpr
  : Extract<T, QueryInvalidationExpr> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseQueryInvalidationExpr;
}
export function isExactlyQueryInvalidationExpr(
  x: any,
): x is QueryInvalidationExpr {
  return x?.['typeTag'] === 'QueryInvalidationExpr';
}

export function ensureKnownQueryInvalidationExpr<T>(
  x: [Extract<T, QueryInvalidationExpr>] extends [never] ? never : T,
): QueryInvalidationExpr {
  assert(isKnownQueryInvalidationExpr(x), () =>
    mkUnexpectedTypeMsg([QueryInvalidationExpr], x),
  );
  return x;
}
export function ensureMaybeKnownQueryInvalidationExpr<T>(
  x: [Extract<T, QueryInvalidationExpr>] extends [never] ? never : T,
): QueryInvalidationExpr | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownQueryInvalidationExpr(x);
}

export type QueryInvalidationExpr = KnownQueryInvalidationExpr;
export interface QueryInvalidationExprParams {
  invalidationQueries: Array<QueryRef | string> /*  */;
  invalidationKeys:
    | CustomCode
    | null
    | undefined
    | ObjectPath
    | null
    | undefined /*  */;
}

abstract class BaseQueryInvalidationExpr extends BaseExpr {
  static isKnown(x: any): x is QueryInvalidationExpr {
    return isKnownQueryInvalidationExpr(x);
  }
  static getType(): QueryInvalidationExpr {
    throw new Error();
  }
  static modelTypeName = 'QueryInvalidationExpr';

  constructor(args: QueryInvalidationExprParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.QueryInvalidationExpr(this, args);
    }
  }
  uid: number;
  invalidationQueries: Array<QueryRef | string> /*  */;
  invalidationKeys:
    | CustomCode
    | null
    | undefined
    | ObjectPath
    | null
    | undefined /*  */;
}
class ClsQueryInvalidationExpr extends BaseQueryInvalidationExpr {
  get typeTag(): 'QueryInvalidationExpr' {
    return 'QueryInvalidationExpr';
  }
}
export const QueryInvalidationExpr = ClsQueryInvalidationExpr;

type KnownCompositeExpr = ClsCompositeExpr;
export function isKnownCompositeExpr<T>(
  x: [Extract<T, CompositeExpr>] extends [never] ? never : T,
): x is [Extract<T, CompositeExpr>] extends [never]
  ? never
  : CompositeExpr extends T // Needed when T is any
  ? CompositeExpr
  : Extract<T, CompositeExpr> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseCompositeExpr;
}
export function isExactlyCompositeExpr(x: any): x is CompositeExpr {
  return x?.['typeTag'] === 'CompositeExpr';
}

export function ensureKnownCompositeExpr<T>(
  x: [Extract<T, CompositeExpr>] extends [never] ? never : T,
): CompositeExpr {
  assert(isKnownCompositeExpr(x), () =>
    mkUnexpectedTypeMsg([CompositeExpr], x),
  );
  return x;
}
export function ensureMaybeKnownCompositeExpr<T>(
  x: [Extract<T, CompositeExpr>] extends [never] ? never : T,
): CompositeExpr | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownCompositeExpr(x);
}

export type CompositeExpr = KnownCompositeExpr;
export interface CompositeExprParams {
  hostLiteral: string /*  */;
  substitutions: {[key: string]: Expr} /*  */;
}

abstract class BaseCompositeExpr extends BaseExpr {
  static isKnown(x: any): x is CompositeExpr {
    return isKnownCompositeExpr(x);
  }
  static getType(): CompositeExpr {
    throw new Error();
  }
  static modelTypeName = 'CompositeExpr';

  constructor(args: CompositeExprParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.CompositeExpr(this, args);
    }
  }
  uid: number;
  hostLiteral: string /*  */;
  substitutions: {[key: string]: Expr} /*  */;
}
class ClsCompositeExpr extends BaseCompositeExpr {
  get typeTag(): 'CompositeExpr' {
    return 'CompositeExpr';
  }
}
export const CompositeExpr = ClsCompositeExpr;

type KnownSelectorRuleSet = ClsSelectorRuleSet;
export function isKnownSelectorRuleSet<T>(
  x: [Extract<T, SelectorRuleSet>] extends [never] ? never : T,
): x is [Extract<T, SelectorRuleSet>] extends [never]
  ? never
  : SelectorRuleSet extends T // Needed when T is any
  ? SelectorRuleSet
  : Extract<T, SelectorRuleSet> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseSelectorRuleSet;
}
export function isExactlySelectorRuleSet(x: any): x is SelectorRuleSet {
  return x?.['typeTag'] === 'SelectorRuleSet';
}

export function ensureKnownSelectorRuleSet<T>(
  x: [Extract<T, SelectorRuleSet>] extends [never] ? never : T,
): SelectorRuleSet {
  assert(isKnownSelectorRuleSet(x), () =>
    mkUnexpectedTypeMsg([SelectorRuleSet], x),
  );
  return x;
}
export function ensureMaybeKnownSelectorRuleSet<T>(
  x: [Extract<T, SelectorRuleSet>] extends [never] ? never : T,
): SelectorRuleSet | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownSelectorRuleSet(x);
}

export type SelectorRuleSet = KnownSelectorRuleSet;
export interface SelectorRuleSetParams {
  rs: RuleSet /*  */;
  selector: string | null | undefined /*  */;
}

abstract class BaseSelectorRuleSet {
  static isKnown(x: any): x is SelectorRuleSet {
    return isKnownSelectorRuleSet(x);
  }
  static getType(): SelectorRuleSet {
    throw new Error();
  }
  static modelTypeName = 'SelectorRuleSet';

  constructor(args: SelectorRuleSetParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.SelectorRuleSet(this, args);
    }
  }
  uid: number;
  rs: RuleSet /*  */;
  selector: string | null | undefined /*  */;
}
class ClsSelectorRuleSet extends BaseSelectorRuleSet {
  get typeTag(): 'SelectorRuleSet' {
    return 'SelectorRuleSet';
  }
}
export const SelectorRuleSet = ClsSelectorRuleSet;

type KnownLabeledSelector = ClsLabeledSelector;
export function isKnownLabeledSelector<T>(
  x: [Extract<T, LabeledSelector>] extends [never] ? never : T,
): x is [Extract<T, LabeledSelector>] extends [never]
  ? never
  : LabeledSelector extends T // Needed when T is any
  ? LabeledSelector
  : Extract<T, LabeledSelector> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseLabeledSelector;
}
export function isExactlyLabeledSelector(x: any): x is LabeledSelector {
  return x?.['typeTag'] === 'LabeledSelector';
}

export function ensureKnownLabeledSelector<T>(
  x: [Extract<T, LabeledSelector>] extends [never] ? never : T,
): LabeledSelector {
  assert(isKnownLabeledSelector(x), () =>
    mkUnexpectedTypeMsg([LabeledSelector], x),
  );
  return x;
}
export function ensureMaybeKnownLabeledSelector<T>(
  x: [Extract<T, LabeledSelector>] extends [never] ? never : T,
): LabeledSelector | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownLabeledSelector(x);
}

export type LabeledSelector = KnownLabeledSelector;
export interface LabeledSelectorParams {
  selector: string /*  */;
  label: string | null | undefined /*  */;
}

abstract class BaseLabeledSelector {
  static isKnown(x: any): x is LabeledSelector {
    return isKnownLabeledSelector(x);
  }
  static getType(): LabeledSelector {
    throw new Error();
  }
  static modelTypeName = 'LabeledSelector';

  constructor(args: LabeledSelectorParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.LabeledSelector(this, args);
    }
  }
  uid: number;
  selector: string /*  */;
  label: string | null | undefined /*  */;
}
class ClsLabeledSelector extends BaseLabeledSelector {
  get typeTag(): 'LabeledSelector' {
    return 'LabeledSelector';
  }
}
export const LabeledSelector = ClsLabeledSelector;

type KnownDataSourceTemplate = ClsDataSourceTemplate;
export function isKnownDataSourceTemplate<T>(
  x: [Extract<T, DataSourceTemplate>] extends [never] ? never : T,
): x is [Extract<T, DataSourceTemplate>] extends [never]
  ? never
  : DataSourceTemplate extends T // Needed when T is any
  ? DataSourceTemplate
  : Extract<T, DataSourceTemplate> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseDataSourceTemplate;
}
export function isExactlyDataSourceTemplate(x: any): x is DataSourceTemplate {
  return x?.['typeTag'] === 'DataSourceTemplate';
}

export function ensureKnownDataSourceTemplate<T>(
  x: [Extract<T, DataSourceTemplate>] extends [never] ? never : T,
): DataSourceTemplate {
  assert(isKnownDataSourceTemplate(x), () =>
    mkUnexpectedTypeMsg([DataSourceTemplate], x),
  );
  return x;
}
export function ensureMaybeKnownDataSourceTemplate<T>(
  x: [Extract<T, DataSourceTemplate>] extends [never] ? never : T,
): DataSourceTemplate | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownDataSourceTemplate(x);
}

export type DataSourceTemplate = KnownDataSourceTemplate;
export interface DataSourceTemplateParams {
  fieldType: string /*  */;
  value: TemplatedString | string /*  */;
  bindings: {[key: string]: Expr} | null | undefined /*  */;
}

abstract class BaseDataSourceTemplate {
  static isKnown(x: any): x is DataSourceTemplate {
    return isKnownDataSourceTemplate(x);
  }
  static getType(): DataSourceTemplate {
    throw new Error();
  }
  static modelTypeName = 'DataSourceTemplate';

  constructor(args: DataSourceTemplateParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.DataSourceTemplate(this, args);
    }
  }
  uid: number;
  fieldType: string /*  */;
  value: TemplatedString | string /*  */;
  bindings: {[key: string]: Expr} | null | undefined /*  */;
}
class ClsDataSourceTemplate extends BaseDataSourceTemplate {
  get typeTag(): 'DataSourceTemplate' {
    return 'DataSourceTemplate';
  }
}
export const DataSourceTemplate = ClsDataSourceTemplate;

type KnownQueryRef = ClsQueryRef;
export function isKnownQueryRef<T>(
  x: [Extract<T, QueryRef>] extends [never] ? never : T,
): x is [Extract<T, QueryRef>] extends [never]
  ? never
  : QueryRef extends T // Needed when T is any
  ? QueryRef
  : Extract<T, QueryRef> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseQueryRef;
}
export function isExactlyQueryRef(x: any): x is QueryRef {
  return x?.['typeTag'] === 'QueryRef';
}

export function ensureKnownQueryRef<T>(
  x: [Extract<T, QueryRef>] extends [never] ? never : T,
): QueryRef {
  assert(isKnownQueryRef(x), () => mkUnexpectedTypeMsg([QueryRef], x));
  return x;
}
export function ensureMaybeKnownQueryRef<T>(
  x: [Extract<T, QueryRef>] extends [never] ? never : T,
): QueryRef | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownQueryRef(x);
}

export type QueryRef = KnownQueryRef;
export interface QueryRefParams {
  ref: TplNode | ComponentDataQuery /* WeakRef */;
}

abstract class BaseQueryRef {
  static isKnown(x: any): x is QueryRef {
    return isKnownQueryRef(x);
  }
  static getType(): QueryRef {
    throw new Error();
  }
  static modelTypeName = 'QueryRef';

  constructor(args: QueryRefParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.QueryRef(this, args);
    }
  }
  uid: number;
  ref: TplNode | ComponentDataQuery /* WeakRef */;
}
class ClsQueryRef extends BaseQueryRef {
  get typeTag(): 'QueryRef' {
    return 'QueryRef';
  }
}
export const QueryRef = ClsQueryRef;

type KnownState = KnownNamedState | ClsState;
export function isKnownState<T>(
  x: [Extract<T, State>] extends [never] ? never : T,
): x is [Extract<T, State>] extends [never]
  ? never
  : State extends T // Needed when T is any
  ? State
  : Extract<T, State> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseState;
}
export function isExactlyState(x: any): x is State {
  return x?.['typeTag'] === 'State';
}

export function ensureKnownState<T>(
  x: [Extract<T, State>] extends [never] ? never : T,
): State {
  assert(isKnownState(x), () => mkUnexpectedTypeMsg([State], x));
  return x;
}
export function ensureMaybeKnownState<T>(
  x: [Extract<T, State>] extends [never] ? never : T,
): State | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownState(x);
}

export type State = KnownState;
export interface StateParams {
  param: Param /* WeakRef */;
  accessType: string /*  */;
  variableType: string /*  */;
  onChangeParam: Param | null | undefined /* WeakRef */;
  tplNode:
    | TplComponent
    | null
    | undefined
    | TplTag
    | null
    | undefined /* WeakRef */;
  implicitState: State | null | undefined /* WeakRef */;
}

abstract class BaseState {
  static isKnown(x: any): x is State {
    return isKnownState(x);
  }
  static getType(): State {
    throw new Error();
  }
  static modelTypeName = 'State';

  constructor(args: StateParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.State(this, args);
    }
  }
  uid: number;
  param: Param /* WeakRef */;
  accessType: string /*  */;
  variableType: string /*  */;
  onChangeParam: Param | null | undefined /* WeakRef */;
  tplNode:
    | TplComponent
    | null
    | undefined
    | TplTag
    | null
    | undefined /* WeakRef */;
  implicitState: State | null | undefined /* WeakRef */;
}
class ClsState extends BaseState {
  get typeTag(): 'State' {
    return 'State';
  }
}
export const State = ClsState;

type KnownNamedState = ClsNamedState;
export function isKnownNamedState<T>(
  x: [Extract<T, NamedState>] extends [never] ? never : T,
): x is [Extract<T, NamedState>] extends [never]
  ? never
  : NamedState extends T // Needed when T is any
  ? NamedState
  : Extract<T, NamedState> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseNamedState;
}
export function isExactlyNamedState(x: any): x is NamedState {
  return x?.['typeTag'] === 'NamedState';
}

export function ensureKnownNamedState<T>(
  x: [Extract<T, NamedState>] extends [never] ? never : T,
): NamedState {
  assert(isKnownNamedState(x), () => mkUnexpectedTypeMsg([NamedState], x));
  return x;
}
export function ensureMaybeKnownNamedState<T>(
  x: [Extract<T, NamedState>] extends [never] ? never : T,
): NamedState | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownNamedState(x);
}

export type NamedState = KnownNamedState;
export interface NamedStateParams {
  name: string /*  */;
  param: Param /* WeakRef */;
  accessType: string /*  */;
  variableType: string /*  */;
  onChangeParam: Param | null | undefined /* WeakRef */;
  tplNode:
    | TplComponent
    | null
    | undefined
    | TplTag
    | null
    | undefined /* WeakRef */;
  implicitState: State | null | undefined /* WeakRef */;
}

abstract class BaseNamedState extends BaseState {
  static isKnown(x: any): x is NamedState {
    return isKnownNamedState(x);
  }
  static getType(): NamedState {
    throw new Error();
  }
  static modelTypeName = 'NamedState';

  constructor(args: NamedStateParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.NamedState(this, args);
    }
  }
  uid: number;
  name: string /*  */;
  param: Param /* WeakRef */;
  accessType: string /*  */;
  variableType: string /*  */;
  onChangeParam: Param | null | undefined /* WeakRef */;
  tplNode:
    | TplComponent
    | null
    | undefined
    | TplTag
    | null
    | undefined /* WeakRef */;
  implicitState: State | null | undefined /* WeakRef */;
}
class ClsNamedState extends BaseNamedState {
  get typeTag(): 'NamedState' {
    return 'NamedState';
  }
}
export const NamedState = ClsNamedState;

type KnownSplit = ClsSplit;
export function isKnownSplit<T>(
  x: [Extract<T, Split>] extends [never] ? never : T,
): x is [Extract<T, Split>] extends [never]
  ? never
  : Split extends T // Needed when T is any
  ? Split
  : Extract<T, Split> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseSplit;
}
export function isExactlySplit(x: any): x is Split {
  return x?.['typeTag'] === 'Split';
}

export function ensureKnownSplit<T>(
  x: [Extract<T, Split>] extends [never] ? never : T,
): Split {
  assert(isKnownSplit(x), () => mkUnexpectedTypeMsg([Split], x));
  return x;
}
export function ensureMaybeKnownSplit<T>(
  x: [Extract<T, Split>] extends [never] ? never : T,
): Split | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownSplit(x);
}

export type Split = KnownSplit;
export interface SplitParams {
  readonly uuid: string /* Const */;
  name: string /*  */;
  splitType: string /*  */;
  slices: Array<SplitSlice> /*  */;
  status: string /*  */;
  targetEvents: Array<string> /*  */;
  description: string | null | undefined /*  */;
  externalId: string | null | undefined /*  */;
}

abstract class BaseSplit {
  static isKnown(x: any): x is Split {
    return isKnownSplit(x);
  }
  static getType(): Split {
    throw new Error();
  }
  static modelTypeName = 'Split';

  constructor(args: SplitParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.Split(this, args);
    }
  }
  uid: number;
  readonly uuid: string /* Const */;
  name: string /*  */;
  splitType: string /*  */;
  slices: Array<SplitSlice> /*  */;
  status: string /*  */;
  targetEvents: Array<string> /*  */;
  description: string | null | undefined /*  */;
  externalId: string | null | undefined /*  */;
}
class ClsSplit extends BaseSplit {
  get typeTag(): 'Split' {
    return 'Split';
  }
}
export const Split = ClsSplit;

type KnownSplitSlice = KnownRandomSplitSlice | KnownSegmentSplitSlice;
export function isKnownSplitSlice<T>(
  x: [Extract<T, SplitSlice>] extends [never] ? never : T,
): x is [Extract<T, SplitSlice>] extends [never]
  ? never
  : SplitSlice extends T // Needed when T is any
  ? SplitSlice
  : Extract<T, SplitSlice> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseSplitSlice;
}

export function ensureKnownSplitSlice<T>(
  x: [Extract<T, SplitSlice>] extends [never] ? never : T,
): SplitSlice {
  assert(isKnownSplitSlice(x), () => mkUnexpectedTypeMsg([SplitSlice], x));
  return x;
}
export function ensureMaybeKnownSplitSlice<T>(
  x: [Extract<T, SplitSlice>] extends [never] ? never : T,
): SplitSlice | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownSplitSlice(x);
}

export type SplitSlice = KnownSplitSlice;
export interface SplitSliceParams {
  readonly uuid: string /* Const */;
  name: string /*  */;
  externalId: string | null | undefined /*  */;
  contents: Array<SplitContent> /*  */;
}

abstract class BaseSplitSlice {
  static isKnown(x: any): x is SplitSlice {
    return isKnownSplitSlice(x);
  }
  static getType(): SplitSlice {
    throw new Error();
  }
  static modelTypeName = 'SplitSlice';

  constructor(args: SplitSliceParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.SplitSlice(this, args);
    }
  }
  uid: number;
  readonly uuid: string /* Const */;
  name: string /*  */;
  externalId: string | null | undefined /*  */;
  contents: Array<SplitContent> /*  */;
}

export const SplitSlice = BaseSplitSlice;

type KnownRandomSplitSlice = ClsRandomSplitSlice;
export function isKnownRandomSplitSlice<T>(
  x: [Extract<T, RandomSplitSlice>] extends [never] ? never : T,
): x is [Extract<T, RandomSplitSlice>] extends [never]
  ? never
  : RandomSplitSlice extends T // Needed when T is any
  ? RandomSplitSlice
  : Extract<T, RandomSplitSlice> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseRandomSplitSlice;
}
export function isExactlyRandomSplitSlice(x: any): x is RandomSplitSlice {
  return x?.['typeTag'] === 'RandomSplitSlice';
}

export function ensureKnownRandomSplitSlice<T>(
  x: [Extract<T, RandomSplitSlice>] extends [never] ? never : T,
): RandomSplitSlice {
  assert(isKnownRandomSplitSlice(x), () =>
    mkUnexpectedTypeMsg([RandomSplitSlice], x),
  );
  return x;
}
export function ensureMaybeKnownRandomSplitSlice<T>(
  x: [Extract<T, RandomSplitSlice>] extends [never] ? never : T,
): RandomSplitSlice | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownRandomSplitSlice(x);
}

export type RandomSplitSlice = KnownRandomSplitSlice;
export interface RandomSplitSliceParams {
  prob: number /*  */;
  readonly uuid: string /* Const */;
  name: string /*  */;
  externalId: string | null | undefined /*  */;
  contents: Array<SplitContent> /*  */;
}

abstract class BaseRandomSplitSlice extends BaseSplitSlice {
  static isKnown(x: any): x is RandomSplitSlice {
    return isKnownRandomSplitSlice(x);
  }
  static getType(): RandomSplitSlice {
    throw new Error();
  }
  static modelTypeName = 'RandomSplitSlice';

  constructor(args: RandomSplitSliceParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.RandomSplitSlice(this, args);
    }
  }
  uid: number;
  prob: number /*  */;
  readonly uuid: string /* Const */;
  name: string /*  */;
  externalId: string | null | undefined /*  */;
  contents: Array<SplitContent> /*  */;
}
class ClsRandomSplitSlice extends BaseRandomSplitSlice {
  get typeTag(): 'RandomSplitSlice' {
    return 'RandomSplitSlice';
  }
}
export const RandomSplitSlice = ClsRandomSplitSlice;

type KnownSegmentSplitSlice = ClsSegmentSplitSlice;
export function isKnownSegmentSplitSlice<T>(
  x: [Extract<T, SegmentSplitSlice>] extends [never] ? never : T,
): x is [Extract<T, SegmentSplitSlice>] extends [never]
  ? never
  : SegmentSplitSlice extends T // Needed when T is any
  ? SegmentSplitSlice
  : Extract<T, SegmentSplitSlice> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseSegmentSplitSlice;
}
export function isExactlySegmentSplitSlice(x: any): x is SegmentSplitSlice {
  return x?.['typeTag'] === 'SegmentSplitSlice';
}

export function ensureKnownSegmentSplitSlice<T>(
  x: [Extract<T, SegmentSplitSlice>] extends [never] ? never : T,
): SegmentSplitSlice {
  assert(isKnownSegmentSplitSlice(x), () =>
    mkUnexpectedTypeMsg([SegmentSplitSlice], x),
  );
  return x;
}
export function ensureMaybeKnownSegmentSplitSlice<T>(
  x: [Extract<T, SegmentSplitSlice>] extends [never] ? never : T,
): SegmentSplitSlice | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownSegmentSplitSlice(x);
}

export type SegmentSplitSlice = KnownSegmentSplitSlice;
export interface SegmentSplitSliceParams {
  cond: string /*  */;
  readonly uuid: string /* Const */;
  name: string /*  */;
  externalId: string | null | undefined /*  */;
  contents: Array<SplitContent> /*  */;
}

abstract class BaseSegmentSplitSlice extends BaseSplitSlice {
  static isKnown(x: any): x is SegmentSplitSlice {
    return isKnownSegmentSplitSlice(x);
  }
  static getType(): SegmentSplitSlice {
    throw new Error();
  }
  static modelTypeName = 'SegmentSplitSlice';

  constructor(args: SegmentSplitSliceParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.SegmentSplitSlice(this, args);
    }
  }
  uid: number;
  cond: string /*  */;
  readonly uuid: string /* Const */;
  name: string /*  */;
  externalId: string | null | undefined /*  */;
  contents: Array<SplitContent> /*  */;
}
class ClsSegmentSplitSlice extends BaseSegmentSplitSlice {
  get typeTag(): 'SegmentSplitSlice' {
    return 'SegmentSplitSlice';
  }
}
export const SegmentSplitSlice = ClsSegmentSplitSlice;

type KnownSplitContent =
  | KnownGlobalVariantSplitContent
  | KnownComponentVariantSplitContent
  | KnownComponentSwapSplitContent;
export function isKnownSplitContent<T>(
  x: [Extract<T, SplitContent>] extends [never] ? never : T,
): x is [Extract<T, SplitContent>] extends [never]
  ? never
  : SplitContent extends T // Needed when T is any
  ? SplitContent
  : Extract<T, SplitContent> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseSplitContent;
}

export function ensureKnownSplitContent<T>(
  x: [Extract<T, SplitContent>] extends [never] ? never : T,
): SplitContent {
  assert(isKnownSplitContent(x), () => mkUnexpectedTypeMsg([SplitContent], x));
  return x;
}
export function ensureMaybeKnownSplitContent<T>(
  x: [Extract<T, SplitContent>] extends [never] ? never : T,
): SplitContent | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownSplitContent(x);
}

export type SplitContent = KnownSplitContent;
export interface SplitContentParams {}

abstract class BaseSplitContent {
  static isKnown(x: any): x is SplitContent {
    return isKnownSplitContent(x);
  }
  static getType(): SplitContent {
    throw new Error();
  }
  static modelTypeName = 'SplitContent';

  constructor(args: SplitContentParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.SplitContent(this, args);
    }
  }
  uid: number;
}

export const SplitContent = BaseSplitContent;

type KnownGlobalVariantSplitContent = ClsGlobalVariantSplitContent;
export function isKnownGlobalVariantSplitContent<T>(
  x: [Extract<T, GlobalVariantSplitContent>] extends [never] ? never : T,
): x is [Extract<T, GlobalVariantSplitContent>] extends [never]
  ? never
  : GlobalVariantSplitContent extends T // Needed when T is any
  ? GlobalVariantSplitContent
  : Extract<T, GlobalVariantSplitContent> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseGlobalVariantSplitContent;
}
export function isExactlyGlobalVariantSplitContent(
  x: any,
): x is GlobalVariantSplitContent {
  return x?.['typeTag'] === 'GlobalVariantSplitContent';
}

export function ensureKnownGlobalVariantSplitContent<T>(
  x: [Extract<T, GlobalVariantSplitContent>] extends [never] ? never : T,
): GlobalVariantSplitContent {
  assert(isKnownGlobalVariantSplitContent(x), () =>
    mkUnexpectedTypeMsg([GlobalVariantSplitContent], x),
  );
  return x;
}
export function ensureMaybeKnownGlobalVariantSplitContent<T>(
  x: [Extract<T, GlobalVariantSplitContent>] extends [never] ? never : T,
): GlobalVariantSplitContent | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownGlobalVariantSplitContent(x);
}

export type GlobalVariantSplitContent = KnownGlobalVariantSplitContent;
export interface GlobalVariantSplitContentParams {
  group: VariantGroup /* WeakRef */;
  variant: Variant /* WeakRef */;
}

abstract class BaseGlobalVariantSplitContent extends BaseSplitContent {
  static isKnown(x: any): x is GlobalVariantSplitContent {
    return isKnownGlobalVariantSplitContent(x);
  }
  static getType(): GlobalVariantSplitContent {
    throw new Error();
  }
  static modelTypeName = 'GlobalVariantSplitContent';

  constructor(args: GlobalVariantSplitContentParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.GlobalVariantSplitContent(this, args);
    }
  }
  uid: number;
  group: VariantGroup /* WeakRef */;
  variant: Variant /* WeakRef */;
}
class ClsGlobalVariantSplitContent extends BaseGlobalVariantSplitContent {
  get typeTag(): 'GlobalVariantSplitContent' {
    return 'GlobalVariantSplitContent';
  }
}
export const GlobalVariantSplitContent = ClsGlobalVariantSplitContent;

type KnownComponentVariantSplitContent = ClsComponentVariantSplitContent;
export function isKnownComponentVariantSplitContent<T>(
  x: [Extract<T, ComponentVariantSplitContent>] extends [never] ? never : T,
): x is [Extract<T, ComponentVariantSplitContent>] extends [never]
  ? never
  : ComponentVariantSplitContent extends T // Needed when T is any
  ? ComponentVariantSplitContent
  : Extract<T, ComponentVariantSplitContent> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseComponentVariantSplitContent;
}
export function isExactlyComponentVariantSplitContent(
  x: any,
): x is ComponentVariantSplitContent {
  return x?.['typeTag'] === 'ComponentVariantSplitContent';
}

export function ensureKnownComponentVariantSplitContent<T>(
  x: [Extract<T, ComponentVariantSplitContent>] extends [never] ? never : T,
): ComponentVariantSplitContent {
  assert(isKnownComponentVariantSplitContent(x), () =>
    mkUnexpectedTypeMsg([ComponentVariantSplitContent], x),
  );
  return x;
}
export function ensureMaybeKnownComponentVariantSplitContent<T>(
  x: [Extract<T, ComponentVariantSplitContent>] extends [never] ? never : T,
): ComponentVariantSplitContent | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownComponentVariantSplitContent(x);
}

export type ComponentVariantSplitContent = KnownComponentVariantSplitContent;
export interface ComponentVariantSplitContentParams {
  component: Component /* WeakRef */;
  group: VariantGroup /* WeakRef */;
  variant: Variant /* WeakRef */;
}

abstract class BaseComponentVariantSplitContent extends BaseSplitContent {
  static isKnown(x: any): x is ComponentVariantSplitContent {
    return isKnownComponentVariantSplitContent(x);
  }
  static getType(): ComponentVariantSplitContent {
    throw new Error();
  }
  static modelTypeName = 'ComponentVariantSplitContent';

  constructor(args: ComponentVariantSplitContentParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.ComponentVariantSplitContent(this, args);
    }
  }
  uid: number;
  component: Component /* WeakRef */;
  group: VariantGroup /* WeakRef */;
  variant: Variant /* WeakRef */;
}
class ClsComponentVariantSplitContent extends BaseComponentVariantSplitContent {
  get typeTag(): 'ComponentVariantSplitContent' {
    return 'ComponentVariantSplitContent';
  }
}
export const ComponentVariantSplitContent = ClsComponentVariantSplitContent;

type KnownComponentSwapSplitContent = ClsComponentSwapSplitContent;
export function isKnownComponentSwapSplitContent<T>(
  x: [Extract<T, ComponentSwapSplitContent>] extends [never] ? never : T,
): x is [Extract<T, ComponentSwapSplitContent>] extends [never]
  ? never
  : ComponentSwapSplitContent extends T // Needed when T is any
  ? ComponentSwapSplitContent
  : Extract<T, ComponentSwapSplitContent> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseComponentSwapSplitContent;
}
export function isExactlyComponentSwapSplitContent(
  x: any,
): x is ComponentSwapSplitContent {
  return x?.['typeTag'] === 'ComponentSwapSplitContent';
}

export function ensureKnownComponentSwapSplitContent<T>(
  x: [Extract<T, ComponentSwapSplitContent>] extends [never] ? never : T,
): ComponentSwapSplitContent {
  assert(isKnownComponentSwapSplitContent(x), () =>
    mkUnexpectedTypeMsg([ComponentSwapSplitContent], x),
  );
  return x;
}
export function ensureMaybeKnownComponentSwapSplitContent<T>(
  x: [Extract<T, ComponentSwapSplitContent>] extends [never] ? never : T,
): ComponentSwapSplitContent | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownComponentSwapSplitContent(x);
}

export type ComponentSwapSplitContent = KnownComponentSwapSplitContent;
export interface ComponentSwapSplitContentParams {
  fromComponent: Component /* WeakRef */;
  toComponent: Component /* WeakRef */;
}

abstract class BaseComponentSwapSplitContent extends BaseSplitContent {
  static isKnown(x: any): x is ComponentSwapSplitContent {
    return isKnownComponentSwapSplitContent(x);
  }
  static getType(): ComponentSwapSplitContent {
    throw new Error();
  }
  static modelTypeName = 'ComponentSwapSplitContent';

  constructor(args: ComponentSwapSplitContentParams | Sentinel) {
    super(sentinel);
    if (args !== sentinel) {
      meta.initializers.ComponentSwapSplitContent(this, args);
    }
  }
  uid: number;
  fromComponent: Component /* WeakRef */;
  toComponent: Component /* WeakRef */;
}
class ClsComponentSwapSplitContent extends BaseComponentSwapSplitContent {
  get typeTag(): 'ComponentSwapSplitContent' {
    return 'ComponentSwapSplitContent';
  }
}
export const ComponentSwapSplitContent = ClsComponentSwapSplitContent;

type KnownFigmaComponentMapping = ClsFigmaComponentMapping;
export function isKnownFigmaComponentMapping<T>(
  x: [Extract<T, FigmaComponentMapping>] extends [never] ? never : T,
): x is [Extract<T, FigmaComponentMapping>] extends [never]
  ? never
  : FigmaComponentMapping extends T // Needed when T is any
  ? FigmaComponentMapping
  : Extract<T, FigmaComponentMapping> {
  // eslint-disable-next-line no-restricted-syntax
  return x instanceof BaseFigmaComponentMapping;
}
export function isExactlyFigmaComponentMapping(
  x: any,
): x is FigmaComponentMapping {
  return x?.['typeTag'] === 'FigmaComponentMapping';
}

export function ensureKnownFigmaComponentMapping<T>(
  x: [Extract<T, FigmaComponentMapping>] extends [never] ? never : T,
): FigmaComponentMapping {
  assert(isKnownFigmaComponentMapping(x), () =>
    mkUnexpectedTypeMsg([FigmaComponentMapping], x),
  );
  return x;
}
export function ensureMaybeKnownFigmaComponentMapping<T>(
  x: [Extract<T, FigmaComponentMapping>] extends [never] ? never : T,
): FigmaComponentMapping | undefined | null {
  if (x === undefined) {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  return ensureKnownFigmaComponentMapping(x);
}

export type FigmaComponentMapping = KnownFigmaComponentMapping;
export interface FigmaComponentMappingParams {
  figmaComponentName: string /*  */;
}

abstract class BaseFigmaComponentMapping {
  static isKnown(x: any): x is FigmaComponentMapping {
    return isKnownFigmaComponentMapping(x);
  }
  static getType(): FigmaComponentMapping {
    throw new Error();
  }
  static modelTypeName = 'FigmaComponentMapping';

  constructor(args: FigmaComponentMappingParams | Sentinel) {
    if (args !== sentinel) {
      meta.initializers.FigmaComponentMapping(this, args);
    }
  }
  uid: number;
  figmaComponentName: string /*  */;
}
class ClsFigmaComponentMapping extends BaseFigmaComponentMapping {
  get typeTag(): 'FigmaComponentMapping' {
    return 'FigmaComponentMapping';
  }
}
export const FigmaComponentMapping = ClsFigmaComponentMapping;
export type Val = string | number | {};
export const justClasses = {
  Type,
  Scalar,
  Num,
  Text,
  Bool,
  Img,
  Any,
  Choice,
  ComponentInstance,
  PlumeInstance,
  UserType,
  QueryData,
  FunctionType,
  ArgType,
  ClassNamePropType,
  StyleScopeClassNamePropType,
  DefaultStylesClassNamePropType,
  DefaultStylesPropType,
  ColorPropType,
  VariantedValue,
  StyleToken,
  HostLessPackageInfo,
  Site,
  ArenaFrameGrid,
  ArenaFrameRow,
  ArenaFrameCell,
  ComponentArena,
  PageArena,
  Arena,
  FocusedFrameArena,
  ArenaChild,
  ArenaFrame,
  OpaqueType,
  RenderFuncType,
  StyleNode,
  RuleSet,
  Rule,
  VariantedRuleSet,
  Mixin,
  Theme,
  ThemeStyle,
  ThemeLayoutSettings,
  ProjectDependency,
  ImageAsset,
  TplNode,
  TplTag,
  TplComponent,
  TplSlot,
  ColumnsSetting,
  PageMeta,
  ComponentDataQuery,
  CodeComponentHelper,
  CodeComponentMeta,
  Component,
  NameArg,
  PlumeInfo,
  ComponentTemplateInfo,
  Variant,
  VariantGroup,
  ComponentVariantGroup,
  VariantSetting,
  Interaction,
  ColumnsConfig,
  Marker,
  StyleMarker,
  NodeMarker,
  RichText,
  RawText,
  ExprText,
  Var,
  BindingStruct,
  Rep,
  Param,
  Arg,
  Expr,
  RenderExpr,
  VirtualRenderExpr,
  CustomCode,
  DataSourceOpExpr,
  VarRef,
  TplRef,
  StyleTokenRef,
  ImageAssetRef,
  PageHref,
  VariantsRef,
  ObjectPath,
  EventHandler,
  GenericEventHandler,
  FunctionArg,
  StrongFunctionArg,
  CollectionExpr,
  MapExpr,
  StyleExpr,
  TemplatedString,
  FunctionExpr,
  QueryInvalidationExpr,
  CompositeExpr,
  SelectorRuleSet,
  LabeledSelector,
  DataSourceTemplate,
  QueryRef,
  State,
  NamedState,
  Split,
  SplitSlice,
  RandomSplitSlice,
  SegmentSplitSlice,
  SplitContent,
  GlobalVariantSplitContent,
  ComponentVariantSplitContent,
  ComponentSwapSplitContent,
  FigmaComponentMapping,
} as const;
export type ObjInst =
  | Type
  | Scalar
  | Num
  | Text
  | Bool
  | Img
  | Any
  | Choice
  | ComponentInstance
  | PlumeInstance
  | UserType
  | QueryData
  | FunctionType
  | ArgType
  | ClassNamePropType
  | StyleScopeClassNamePropType
  | DefaultStylesClassNamePropType
  | DefaultStylesPropType
  | ColorPropType
  | VariantedValue
  | StyleToken
  | HostLessPackageInfo
  | Site
  | ArenaFrameGrid
  | ArenaFrameRow
  | ArenaFrameCell
  | ComponentArena
  | PageArena
  | Arena
  | FocusedFrameArena
  | ArenaChild
  | ArenaFrame
  | OpaqueType
  | RenderFuncType
  | StyleNode
  | RuleSet
  | Rule
  | VariantedRuleSet
  | Mixin
  | Theme
  | ThemeStyle
  | ThemeLayoutSettings
  | ProjectDependency
  | ImageAsset
  | TplNode
  | TplTag
  | TplComponent
  | TplSlot
  | ColumnsSetting
  | PageMeta
  | ComponentDataQuery
  | CodeComponentHelper
  | CodeComponentMeta
  | Component
  | NameArg
  | PlumeInfo
  | ComponentTemplateInfo
  | Variant
  | VariantGroup
  | ComponentVariantGroup
  | VariantSetting
  | Interaction
  | ColumnsConfig
  | Marker
  | StyleMarker
  | NodeMarker
  | RichText
  | RawText
  | ExprText
  | Var
  | BindingStruct
  | Rep
  | Param
  | Arg
  | Expr
  | RenderExpr
  | VirtualRenderExpr
  | CustomCode
  | DataSourceOpExpr
  | VarRef
  | TplRef
  | StyleTokenRef
  | ImageAssetRef
  | PageHref
  | VariantsRef
  | ObjectPath
  | EventHandler
  | GenericEventHandler
  | FunctionArg
  | StrongFunctionArg
  | CollectionExpr
  | MapExpr
  | StyleExpr
  | TemplatedString
  | FunctionExpr
  | QueryInvalidationExpr
  | CompositeExpr
  | SelectorRuleSet
  | LabeledSelector
  | DataSourceTemplate
  | QueryRef
  | State
  | NamedState
  | Split
  | SplitSlice
  | RandomSplitSlice
  | SegmentSplitSlice
  | SplitContent
  | GlobalVariantSplitContent
  | ComponentVariantSplitContent
  | ComponentSwapSplitContent
  | FigmaComponentMapping;
