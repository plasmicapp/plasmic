import { usePlasmicQueryData } from "@plasmicapp/query";
import { usePlasmicCanvasContext } from "@plasmicapp/host";

// Find your CMS ID and Public Token from the settings page.
const CMS_ID = "fsLEEYPvTG4273dgGWDjTD";
const CMS_PUBLIC_TOKEN =
  "mVNCvWZXrTQnQxMSQR1R5jJcqNaSLLNAwGlL3vYiywbftKNATg8sp64R2zEKQ4NQeySy9M8uNntA4rVCLQQ";

/** Generic method for fetching data from Plasmic CMS. */
async function getContentEntries(modelId: string, entryId?: string) {
  const apiUrl = new URL(
    `https://data.plasmic.app/api/v1/cms/databases/${CMS_ID}/tables/${modelId}/query`
  );

  // Set a filter to load entries with "slug" field value = "my-first-blog-post".
  apiUrl.search = new URLSearchParams({
    q: JSON.stringify({
      ...(entryId
        ? {
            where: {
              // Or filter by slug: ..., etc.
              _id: entryId,
            },
          }
        : {}),
    }),
  }).toString();

  // Load filtered entries
  const response = await fetch(apiUrl.toString(), {
    headers: {
      // Your CMS ID and CMS Public API token
      "x-plasmic-api-cms-tokens": `${CMS_ID}:${CMS_PUBLIC_TOKEN}`,
    },
  });

  const parsedResponse = await response.json();

  return parsedResponse.rows;
}

export function BlogPost({
  postId,
  className,
  setControlContextData,
}: {
  postId?: string;
  className?: string;
  setControlContextData?: (ctxData: { allPosts: any[] }) => void;
}) {
  const plasmicCtx = usePlasmicCanvasContext();
  const { data: thePost } = usePlasmicQueryData(`post-${postId}`, async () => {
    const [post] = await getContentEntries("blogPosts", postId);
    return post;
  });
  // Only in Studio
  const { data: allPosts } = usePlasmicQueryData(`all-posts`, async () => {
    return plasmicCtx ? await getContentEntries("blogPosts") : [];
  });
  setControlContextData?.({ allPosts });
  if (!postId) {
    return <div className={className}>Please select a post!</div>;
  }
  return (
    thePost && (
      <div className={className}>
        <h1>{thePost.data.title}</h1>
        <p>{thePost.data.body}</p>
      </div>
    )
  );
}
