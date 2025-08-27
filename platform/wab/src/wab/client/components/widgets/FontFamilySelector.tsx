import Chip from "@/wab/client/components/widgets/Chip";
import { Icon } from "@/wab/client/components/widgets/Icon";
import TriangleBottomIcon from "@/wab/client/plasmic/plasmic_kit/PlasmicIcon__TriangleBottom";
import { useUndo } from "@/wab/client/shortcuts/studio/useUndo";
import { StudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { derefToken, mkTokenRef } from "@/wab/commons/StyleToken";
import { cx, withoutNils } from "@/wab/shared/common";
import { siteFinalStyleTokensOfType } from "@/wab/shared/core/site-style-tokens";
import { VariantedStylesHelper } from "@/wab/shared/VariantedStylesHelper";
import { Select } from "antd";
import { observer } from "mobx-react";
import * as React from "react";

const CSS_VAR_REGEX = /^var\(--(.*)\)$/;

export const FontFamilySelector = observer(function FontFamilySelector(props: {
  studioCtx: StudioCtx;
  selectOpts: {
    value?: string;
    onChange: (val: string) => void;
    disabled?: boolean;
    textboxUnset?: boolean;
    vsh?: VariantedStylesHelper;
  };
  "data-test-id"?: string;
}) {
  const { selectOpts, studioCtx } = props;

  const tokens = siteFinalStyleTokensOfType(studioCtx.site, "FontFamily", {
    includeDeps: "direct",
  });

  const disabled = selectOpts.disabled ?? false;
  const textboxUnset = selectOpts.textboxUnset ?? false;
  const vsh = selectOpts.vsh;

  const userManagedFonts = studioCtx.fontManager
    .userManagedFonts()
    .map((fontFamily) => {
      // We allow a hack where users can add a custom font with a CSS variable.
      // See https://docs.plasmic.app/learn/custom-fonts/#example-with-nextjs-and-nextfontlocal.
      // In this case, the fontFamily looks like "var(--MyFontVariableName)".
      // Display a friendlier name in the font selector for content editors like "MyFontVariableName".
      const match = fontFamily.match(CSS_VAR_REGEX);
      const label = match ? match[1] : fontFamily;
      return {
        label,
        fontFamily,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
  const plasmicManagedFonts = studioCtx.fontManager
    .plasmicManagedFonts()
    .map((spec) => ({
      label: spec.fontFamily,
      fontFamily: spec.fontFamily,
    }))
    .sort((a, b) => a.fontFamily.localeCompare(b.fontFamily));

  const searchUndo = useUndo("");

  return (
    <Select
      className={cx({
        "flex-fill textboxlike": true,
        "text-set": !textboxUnset,
        "text-unset": textboxUnset,
      })}
      value={selectOpts.value}
      onChange={(value) => {
        selectOpts.onChange(value);
        searchUndo.reset();
      }}
      showSearch
      searchValue={searchUndo.value}
      onSearch={searchUndo.push}
      onInputKeyDown={searchUndo.handleKeyDown}
      onFocus={() => {
        searchUndo.reset();
      }}
      filterOption={(val, opt) => {
        if (!opt) {
          return false;
        }

        if ("searchText" in opt) {
          return opt.searchText.toLowerCase().includes(val.toLowerCase());
        }
        return false;
      }}
      suffixIcon={<Icon icon={TriangleBottomIcon} />}
      optionLabelProp="label"
      disabled={disabled}
      data-test-id={props["data-test-id"]}
      options={withoutNils([
        tokens.length === 0
          ? undefined
          : {
              label: "Style Tokens",
              options: tokens.map((token) => ({
                value: mkTokenRef(token.base),
                label: (
                  <Chip
                    key={token.uuid}
                    tooltip={`${token.name} (${derefToken(
                      tokens,
                      token,
                      vsh
                    )})`}
                  >
                    {token.name}
                  </Chip>
                ),
                searchText: token.name,
              })),
            },
        userManagedFonts.length === 0
          ? undefined
          : {
              label: "Custom Fonts",
              options: userManagedFonts.map(({ fontFamily, label }) => ({
                value: fontFamily,
                label,
                searchText: label,
              })),
            },
        ...plasmicManagedFonts.map(({ fontFamily, label }) => ({
          value: fontFamily,
          label,
          searchText: label,
        })),
      ])}
    />
  );
});
