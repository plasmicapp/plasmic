import { SerializerBaseContext } from "@/wab/shared/codegen/react-p/types";

/**
 * Function body shared by app router loader/codegen generateMetadata
 */
export function serializeGeneratePageMetadataBody(
  opts: Pick<SerializerBaseContext, "hasServerQueries">
) {
  let body = `const ctx = await makeAppRouterPageCtx({ params, searchParams });\n`;

  if (opts.hasServerQueries) {
    body += `  const serverQueries = create$Queries();
  await unstable_executePlasmicQueries(
    serverQueries,
    createQueries(serverQueries, ctx)
  );
  const metadata = generateDynamicMetadata(serverQueries, ctx);`;
  } else {
    body += `  const metadata = generateDynamicMetadata({}, ctx);`;
  }
  return body;
}
