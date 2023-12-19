import * as classes from "@/wab/classes";
import { meta } from "@/wab/classes-metas";
import { ensure, tuple, xor } from "@/wab/common";
import { Class, Field, MetaRuntime } from "@/wab/model/model-meta";
import L from "lodash";

export class InstUtil {
  private realClass2Class: Map<Function, Class>;
  constructor(
    public meta: MetaRuntime,
    realClasses: { [key: string]: Function }
  ) {
    this.realClass2Class = new Map(
      Object.entries(realClasses).map(([name, cls]) =>
        tuple(cls, meta.clsByName[name])
      )
    );
  }

  allInstFields(inst: classes.ObjInst): Field[] {
    return this.meta.allFields(this.getInstClass(inst));
  }

  isObjInst(inst: any): inst is classes.ObjInst {
    return !!inst && !!this.tryGetInstClass(inst);
  }

  getMetaClassForRealClass(cls: Function) {
    return ensure(this.realClass2Class.get(cls));
  }

  getInstClass(inst: classes.ObjInst) {
    return ensure(this.tryGetInstClass(inst));
  }

  tryGetInstClass(inst: classes.ObjInst) {
    return this.realClass2Class.get(inst.constructor);
  }

  private _equals(
    x: any,
    y: any,
    shallow: boolean,
    ignoreUuidsAndNils: boolean
  ) {
    const fcmp = shallow
      ? (x: any, y: any) => x === y
      : (x: any, y: any) => rec(x, y);
    const visitedX2Y = {};
    const visitedY2X = {};
    const rec = (x: any, y: any) => {
      if (x === y) {
        return true;
      } else if (ignoreUuidsAndNils && x == null && y == null) {
        return true;
      } else if (
        xor(x != null, y != null) ||
        typeof x !== typeof y ||
        x.constructor.name !== y.constructor.name
      ) {
        return false;
      } else if (Array.isArray(x)) {
        return (
          x.length === y.length &&
          L.zip(x, y)
            .map(([a, b]) => {
              return rec(a, b);
            })
            .every(L.identity)
        );
      } else if (this.tryGetInstClass(x) && x.uid != null && y.uid != null) {
        if (x.uid in visitedX2Y) {
          return y.uid === visitedX2Y[x.uid] && x.uid === visitedY2X[y.uid];
        } else {
          visitedX2Y[x.uid] = y.uid;
          visitedY2X[y.uid] = x.uid;
          return this.meta
            .allFields(this.getInstClass(x))
            .map((f) =>
              f.name !== "uuid" || !ignoreUuidsAndNils
                ? fcmp(
                    this.meta.readField(x, f.name),
                    this.meta.readField(y, f.name)
                  )
                : true
            )
            .every(L.identity);
        }
      } else if (L.isObject(x) && L.isObject(y)) {
        return (
          L.isEqual(Object.keys(x), Object.keys(y)) &&
          Object.keys(x)
            .map((f) => rec(x[f], y[f]))
            .every(L.identity)
        );
      } else {
        return L.isEqual(x, y);
      }
    };
    return rec(x, y);
  }

  shallowEquals(x: any, y: any, ignoreUuidsAndNils: boolean = false) {
    return this._equals(x, y, true, ignoreUuidsAndNils);
  }

  deepEquals(x: any, y: any, ignoreUuidsAndNils: boolean = false) {
    return this._equals(x, y, false, ignoreUuidsAndNils);
  }

  getInstClassName(inst: classes.ObjInst) {
    return this.getInstClass(inst).name;
  }
}

export const instUtil = new InstUtil(meta, classes.justClasses);
