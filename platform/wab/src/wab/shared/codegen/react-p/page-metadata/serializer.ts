import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";

/**
 * Function body shared by app router loader/codegen generateMetadata.
 */
export function serializeGeneratePageMetadataBody(
  opts: Pick<SerializerBaseContext, "hasServerQueries">
) {
  let body = `const ctx = await makeAppRouterPageCtx({ params, searchParams });\n`;

  if (opts.hasServerQueries) {
    body += `  const { queries: $q } = await unstable_executePlasmicQueries(
    metadataQueryTree,
    { $props: {}, $ctx: ctx }
  );
  const metadata = generateDynamicMetadata($q, ctx);`;
  } else {
    body += `  const metadata = generateDynamicMetadata({}, ctx);`;
  }
  return body;
}
