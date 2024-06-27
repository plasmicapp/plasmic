import * as fs from "fs";
import * as glob from "glob";
import * as pathmod from "path";

function main() {
  for (const path of glob.sync("src/wab/**/*.{ts,tsx}")) {
    if (["src/wab/shared/model/classes.ts"].includes(path)) {
      continue;
    }
    // This is a list of files that import Type from 'model-meta' instead of 'classes'.
    // Don't replace things like `instanceof Type` in these - that's a different Type than the one in classes!
    const pattern = [
      "src/wab/__tests__/model-spec.ts",
      "src/wab/shared/model/model-generator.ts",
      "src/wab/shared/bundler.ts",
      "src/wab/shared/model/classes-metas.ts",
      "src/wab/shared/model/model-change-util.ts",
      "src/wab/shared/model/model-util.ts",
      "src/wab/shared/site-diffs/model-conflicts-meta.ts",
    ].includes(path)
      ? // without Type
        /\b(isKnown|ensureKnown|ensureMaybeKnown)(Num|Text|DateTime|Id|Bool|Img|Binary|Any|Collection|MapType|Optional|Union|Choice|ComponentInstance|PlumeInstance|QueryData|VariantedValue|StyleToken|BlobRef|HostLessPackageInfo|ProjectDepLocalResource|SiteFolder|Site|ArenaFrameGrid|ArenaFrameRow|ArenaFrameCell|ComponentArena|PageArena|Arena|FocusedFrameArena|ArenaChild|ArenaFrame|OpaqueType|StyleNode|RuleSet|Rule|VariantedRuleSet|Mixin|Theme|ThemeStyle|LocalPresets|ProjectDependency|ImageAsset|TplTag|TplComponent|TplSlot|TplGroup|ColumnsSetting|Preset|PresetGroup|PageMeta|ComponentDataQuery|CodeComponentMeta|Component|Query|RestQuery|FetcherQuery|GraphqlQuery|NameArg|PlumeInfo|Variant|VariantGroup|ComponentVariantGroup|VariantSetting|EventHandler|Interaction|ColumnsConfig|Marker|StyleMarker|NodeMarker|RawText|ExprText|ExprBinding|Var|Cell|Rep|Let|Param|Arg|RenderExpr|VirtualRenderExpr|CustomCode|DataSourceOpExpr|DataSourceTemplate|VarRef|ImageAssetRef|PageHref|VariantsRef|SimplePath|ObjectPath|State|Split|SplitSlice|RandomSplitSlice|SegmentSplitSlice|SplitContent|GlobalVariantSplitContent|ComponentVariantSplitContent|ComponentSwapSplitContent|Scalar|Num|Text|DateTime|Id|Bool|Img|Binary|Any|Collection|MapType|Optional|Union|Choice|ComponentInstance|PlumeInstance|UserType|QueryData|VariantedValue|StyleToken|BlobRef|HostLessPackageInfo|ProjectDepLocalResource|SiteFolder|Site|ArenaFrameGrid|ArenaFrameRow|ArenaFrameCell|ComponentArena|PageArena|Arena|FocusedFrameArena|ArenaChild|ArenaFrame|OpaqueType|StyleNode|RuleSet|Rule|VariantedRuleSet|Mixin|Theme|ThemeStyle|LocalPresets|ProjectDependency|ImageAsset|TplNode|TplTag|TplComponent|TplSlot|TplGroup|ColumnsSetting|Preset|PresetGroup|PageMeta|ComponentDataQuery|CodeComponentMeta|Component|Query|RestQuery|FetcherQuery|GraphqlQuery|NameArg|PlumeInfo|Variant|VariantGroup|ComponentVariantGroup|VariantSetting|EventHandler|Interaction|ColumnsConfig|Marker|StyleMarker|NodeMarker|RichText|RawText|ExprText|ExprBinding|Var|Cell|BindingStruct|Rep|Let|Param|Arg|Expr|RenderExpr|VirtualRenderExpr|CustomCode|DataSourceOpExpr|DataSourceTemplate|VarRef|ImageAssetRef|PageHref|VariantsRef|SimplePath|ObjectPath|State|Split|SplitSlice|RandomSplitSlice|SegmentSplitSlice|SplitContent|GlobalVariantSplitContent|ComponentVariantSplitContent|ComponentSwapSplitContent)\b/g
      : // with Type
        /\b(isKnown|ensureKnown|ensureMaybeKnown)(Num|Text|DateTime|Id|Bool|Img|Binary|Any|Collection|MapType|Optional|Union|Choice|ComponentInstance|PlumeInstance|QueryData|VariantedValue|StyleToken|BlobRef|HostLessPackageInfo|ProjectDepLocalResource|SiteFolder|Site|ArenaFrameGrid|ArenaFrameRow|ArenaFrameCell|ComponentArena|PageArena|Arena|FocusedFrameArena|ArenaChild|ArenaFrame|OpaqueType|StyleNode|RuleSet|Rule|VariantedRuleSet|Mixin|Theme|ThemeStyle|LocalPresets|ProjectDependency|ImageAsset|TplTag|TplComponent|TplSlot|TplGroup|ColumnsSetting|Preset|PresetGroup|PageMeta|ComponentDataQuery|CodeComponentMeta|Component|Query|RestQuery|FetcherQuery|GraphqlQuery|NameArg|PlumeInfo|Variant|VariantGroup|ComponentVariantGroup|VariantSetting|EventHandler|Interaction|ColumnsConfig|Marker|StyleMarker|NodeMarker|RawText|ExprText|ExprBinding|Var|Cell|Rep|Let|Param|Arg|RenderExpr|VirtualRenderExpr|CustomCode|DataSourceOpExpr|DataSourceTemplate|VarRef|ImageAssetRef|PageHref|VariantsRef|SimplePath|ObjectPath|State|Split|SplitSlice|RandomSplitSlice|SegmentSplitSlice|SplitContent|GlobalVariantSplitContent|ComponentVariantSplitContent|ComponentSwapSplitContent|Type|Scalar|Num|Text|DateTime|Id|Bool|Img|Binary|Any|Collection|MapType|Optional|Union|Choice|ComponentInstance|PlumeInstance|UserType|QueryData|VariantedValue|StyleToken|BlobRef|HostLessPackageInfo|ProjectDepLocalResource|SiteFolder|Site|ArenaFrameGrid|ArenaFrameRow|ArenaFrameCell|ComponentArena|PageArena|Arena|FocusedFrameArena|ArenaChild|ArenaFrame|OpaqueType|StyleNode|RuleSet|Rule|VariantedRuleSet|Mixin|Theme|ThemeStyle|LocalPresets|ProjectDependency|ImageAsset|TplNode|TplTag|TplComponent|TplSlot|TplGroup|ColumnsSetting|Preset|PresetGroup|PageMeta|ComponentDataQuery|CodeComponentMeta|Component|Query|RestQuery|FetcherQuery|GraphqlQuery|NameArg|PlumeInfo|Variant|VariantGroup|ComponentVariantGroup|VariantSetting|EventHandler|Interaction|ColumnsConfig|Marker|StyleMarker|NodeMarker|RichText|RawText|ExprText|ExprBinding|Var|Cell|BindingStruct|Rep|Let|Param|Arg|Expr|RenderExpr|VirtualRenderExpr|CustomCode|DataSourceOpExpr|DataSourceTemplate|VarRef|ImageAssetRef|PageHref|VariantsRef|SimplePath|ObjectPath|State|Split|SplitSlice|RandomSplitSlice|SegmentSplitSlice|SplitContent|GlobalVariantSplitContent|ComponentVariantSplitContent|ComponentSwapSplitContent)\b/g;
    let content = fs.readFileSync(path, "utf8");
    const matches = (content as any).matchAll(pattern);
    const syms = new Set([...matches].map(([text]) => text));
    if (syms.size > 0) {
      let relativeClassesPath = pathmod.relative(
        pathmod.dirname(path),
        "src/wab/shared/model/classes"
      );
      if (relativeClassesPath === "classes") {
        relativeClassesPath = "@/wab/shared/model/classes";
      }
      content = `import { ${Array.from(syms).join(
        ", "
      )} } from '${relativeClassesPath}';
${content}`;
    }
    fs.writeFileSync(path, content);
  }
}

main();
