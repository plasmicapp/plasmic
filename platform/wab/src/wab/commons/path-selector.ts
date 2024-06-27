import { Site } from "@/wab/shared/model/classes";

export type Lookup<Path, T = Site> = Path extends []
  ? T extends infer U | undefined
    ? U
    : T
  : T extends object[]
  ? Path extends ["_", ...infer R]
    ? Lookup<R, T[number]>
    : never
  : Path extends [infer K, ...infer R]
  ? K extends keyof T
    ? Lookup<R, T[K]>
    : never
  : never;
export type PathSelector<
  T,
  C = T,
  Path extends (string | number | symbol)[] = []
> = (C extends {}
  ? {
      [P in keyof C]: PathSelector<T, C[P], [...Path, P]>;
    }
  : C) &
  (C extends any[] ? { _: PathSelector<T, C[number], [...Path, "_"]> } : {}) & {
    getPath(): Path;
  };

export function pathSelector<
  T,
  C = T,
  Path extends (string | number | symbol)[] = []
>(path?: Path): PathSelector<T, C, []> {
  return new Proxy(
    {
      getPath(): Path {
        return path ?? ([] as any);
      },
    } as any,
    {
      get(target, name: string) {
        if (name === "getPath") {
          return target[name];
        }
        return pathSelector([...(path ?? []), name]);
      },
    }
  );
}
