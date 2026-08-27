import { getDataTokenSuggestions } from "@/wab/client/components/sidebar-tabs/DataBinding/data-token-suggestions";
import { usePropValueEditorContext } from "@/wab/client/components/sidebar-tabs/PropEditorRow";
import { useStudioCtx } from "@/wab/client/studio-ctx/StudioCtx";
import { DataTokenType } from "@/wab/commons/DataToken";
import { siteDataTokenRefsDirectDeps } from "@/wab/shared/core/site-data-tokens";

export function useSuggestDataTokens(category: DataTokenType) {
  const { paramName, paramOwnerNames, onSelectDataToken } =
    usePropValueEditorContext();
  const studioCtx = useStudioCtx();

  if (!onSelectDataToken || paramName === undefined) {
    return { suggestDataTokens: undefined, onSelectDataToken: undefined };
  }

  return {
    suggestDataTokens: (searchText: string) =>
      getDataTokenSuggestions(
        siteDataTokenRefsDirectDeps(
          studioCtx.site,
          studioCtx.siteInfo.id,
          category
        ),
        { paramName, ownerNames: paramOwnerNames, searchText }
      ),
    onSelectDataToken,
  };
}
