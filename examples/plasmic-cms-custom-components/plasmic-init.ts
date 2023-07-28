import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import { BlogPost } from "@/components/plasmic-cms";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "hkKkU6xT9QN73KxaGXctEt",
      token:
        "xYmcjdKjyiTgp9BnusM4mOK28IMuuCizYRHuje8svRkvSrkOzSkExLdAGccF2mQimllsFBfAVUIAgzjikYg",
    },
  ],

  // By default Plasmic will use the last published version of your project.
  // For development, you can set preview to true, which will use the unpublished
  // project, allowing you to see your designs without publishing.  Please
  // only use this for development, as this is significantly slower.
  preview: false,
});

// You can register any code components that you want to use here; see
// https://docs.plasmic.app/learn/code-components-ref/
// And configure your Plasmic project to use the host url pointing at
// the /plasmic-host page of your nextjs app (for example,
// http://localhost:3000/plasmic-host).  See
// https://docs.plasmic.app/learn/app-hosting/#set-a-plasmic-project-to-use-your-app-host

PLASMIC.registerComponent(BlogPost, {
  name: "BlogPost",
  displayName: "Blog Post",
  props: {
    postId: {
      displayName: "Post",
      // Can also use type: cardPicker, etc.
      type: "choice",
      options: (ps, ctx) =>
        (ctx?.allPosts as any[])?.map((p) => ({
          value: p.id, // Or p.data.slug, etc.
          label: p.identifier, // Or p.data.title, etc.
        })),
    },
  },
});
