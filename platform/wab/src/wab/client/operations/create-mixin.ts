import { TplMgr } from "@/wab/shared/TplMgr";
import { GenericError } from "@/wab/shared/error-handling";
import { Mixin } from "@/wab/shared/model/classes";
import { Result, err, ok } from "neverthrow";

export type CreateMixinResult = Result<Mixin, GenericError>;

export function createMixin(opts: {
  tplMgr: TplMgr;
  name: string;
  preview: string | undefined;
}): CreateMixinResult {
  const { tplMgr, name, preview } = opts;

  if (!name.trim()) {
    return err({ message: "Mixin name cannot be empty." });
  }

  const mixin = tplMgr.addMixin(name);
  mixin.preview = preview;
  return ok(mixin);
}
