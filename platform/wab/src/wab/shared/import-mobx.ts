import type * as MobxType from "mobx";

const mobx: typeof MobxType =
  typeof window === "undefined"
    ? // Force load dev build of mobx in prod
      require("mobx/dist/mobx.cjs.development.js")
    : require("mobx");

export default mobx;
