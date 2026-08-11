import { upsertAnimationSequences } from "@/wab/client/operations/html-to-tpl";
import {
  formatWIError,
  formatWIErrors,
} from "@/wab/client/web-importer/errors";
import { processKeyframesRule } from "@/wab/client/web-importer/html-parser";
import { GenericError } from "@/wab/shared/error-handling";
import { AnimationSequence, Site } from "@/wab/shared/model/classes";
import { Atrule, parse as cssParse, walk } from "css-tree";
import { Result, err, ok, safeTry } from "neverthrow";

export type UpsertAnimationResult = Result<
  { animation: AnimationSequence; errors: string[] },
  GenericError
>;

const parseCss = Result.fromThrowable(
  cssParse,
  (): GenericError => ({ message: `Failed to parse provided CSS` })
);

/**
 * Upsert an animation from a CSS `@keyframes` block.
 * The animation's name comes from the `@keyframes` identifier. If an
 * animation with that name already exists, its keyframes are replaced
 * in place
 */
export function upsertAnimation(opts: {
  site: Site;
  keyframesRule: string;
}): UpsertAnimationResult {
  const { site, keyframesRule } = opts;

  return safeTry<
    { animation: AnimationSequence; errors: string[] },
    GenericError
  >(function* () {
    const parsedCssVal = yield* parseCss(keyframesRule);

    let keyframesAtrule: Atrule | null = null;
    walk(parsedCssVal, (node) => {
      if (
        !keyframesAtrule &&
        node.type === "Atrule" &&
        node.name === "keyframes"
      ) {
        keyframesAtrule = node;
      }
    });

    if (!keyframesAtrule) {
      return err({
        message: "No `@keyframes` rule found in the provided CSS.",
      });
    }

    const { sequence: wiSequence, errors: wiErrors } =
      yield* processKeyframesRule(keyframesAtrule).mapErr(
        (e): GenericError => ({ message: formatWIError(e) })
      );

    if (!wiSequence.name.trim()) {
      return err({
        message:
          "The @keyframes rule is missing an identifier. Expected @keyframes <name> { ... }.",
      });
    }

    if (wiSequence.keyframes.length === 0) {
      return err({
        message:
          "The `@keyframes` rule has no valid keyframe selectors. Use `from`, `to`, or `N%` selectors.",
      });
    }

    const [animation] = upsertAnimationSequences([wiSequence], {
      site,
    });

    return ok({
      animation,
      errors: formatWIErrors(wiErrors),
    });
  });
}
