import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import {
  MoreInfoButton,
  PageChangeButton,
  WatchButton,
} from "./code-components/Button";
import { Collection, CollectionPage } from "./code-components/Collection";
import { Loading } from "./code-components/Loading";
import { Modal } from "./code-components/Modal";
import {
  FetchMovie,
  MoviePoster,
  MovieSimilars,
  MovieTextInfo,
  MovieTrailers,
  MovieVideo,
} from "./code-components/Movie";
import { ReactYoutube, YoutubeThumbnail } from "./code-components/Youtube";

const plasmicProjectId = process.env.PLASMIC_PROJECT_ID ?? "";
const plasmicApiToken = process.env.PLASMIC_API_TOKEN ?? "";
export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: plasmicProjectId,
      token: plasmicApiToken,
    },
  ],
  // By default Plasmic will use the last published version of your project.
  // For development, you can set preview to true, which will use the unpublished
  // project, allowing you to see your designs without publishing.  Please
  // only use this for development, as this is significantly slower.
  preview: true,
});

PLASMIC.registerComponent(Collection, {
  name: "Collection",
  props: {
    category: "string",
    category_id: "string",
    children: {
      type: "slot",
    },
  },
  importPath: "./code-components/Collection",
});

PLASMIC.registerComponent(CollectionPage, {
  name: "CollectionPage",
  props: {
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Placeholder",
      },
    },
    columnGap: {
      type: "number",
      defaultValue: 16,
    },
    loading: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Loading...",
      },
    },
    testLoading: "boolean",
  },
  importPath: "./code-components/Collection",
});

PLASMIC.registerComponent(MoviePoster, {
  name: "MoviePoster",
  props: {
    customStyle: "object",
  },
  importPath: "./code-components/Movie",
});

PLASMIC.registerComponent(MovieTextInfo, {
  name: "MovieTextInfo",
  props: {
    customStyle: "object",
    useDefaultMovie: "boolean",
    separator: "string",
    info: {
      type: "choice",
      options: [
        "cast",
        "title",
        "release_year",
        "overview",
        "cast",
        "genres",
        "runtime",
        "certification",
      ],
    },
    maximumLength: "number",
    itemsLimit: "number",
  },
  importPath: "./code-components/Movie",
});

PLASMIC.registerComponent(MovieVideo, {
  name: "MovieVideo",
  props: {
    useDefaultMovie: "boolean",
    lazyLoading: "boolean",
    width: "string",
    height: "string",
  },
  importPath: "./code-components/Movie",
});

PLASMIC.registerComponent(WatchButton, {
  name: "WatchButton",
  props: {
    children: "slot",
    watchPage: "string",
    useDefaultMovie: "boolean",
  },
  importPath: "./code-components/Button",
});

PLASMIC.registerComponent(PageChangeButton, {
  name: "PageChangeButton",
  props: {
    children: "slot",
    type: {
      type: "choice",
      options: ["left", "right"],
    },
  },
  importPath: "./code-components/Button",
});

PLASMIC.registerComponent(MoreInfoButton, {
  name: "MoreInfoButton",
  props: {
    children: "slot",
    modal: "slot",
    isOpen: "boolean",
  },
  importPath: "./code-components/Button",
});

PLASMIC.registerComponent(ReactYoutube, {
  name: "ReactYoutube",
  props: {
    videoId: {
      type: "string",
    },
    width: {
      type: "string",
    },
    height: {
      type: "string",
    },
    controls: "boolean",
    lazyLoading: "boolean",
  },
  importPath: "./code-components/Youtube",
});

PLASMIC.registerComponent(Modal, {
  name: "Modal",
  props: {
    children: "slot",
    closeIcon: "slot",
    isVisible: "boolean",
    width: "string",
  },
  importPath: "./code-components/Modal",
});

PLASMIC.registerComponent(YoutubeThumbnail, {
  name: "YoutubeThumbnail",
  props: {
    videoId: "string",
    customStyle: "object",
  },
  importPath: "./code-components/Youtube",
});

PLASMIC.registerComponent(Loading, {
  name: "Loading",
  props: {
    children: "slot",
    loadingTime: "number",
    customizeLoading: "boolean",
    loading: "slot",
  },
  importPath: "./code-components/Loading",
});

PLASMIC.registerComponent(MovieTrailers, {
  name: "MovieTrailers",
  props: {
    children: "slot",
    useDefaultMovie: "boolean",
    columns: "number",
    columnGap: "number",
    rowGap: "number",
  },
  importPath: "./code-components/Movie",
});

PLASMIC.registerComponent(MovieSimilars, {
  name: "MovieSimilars",
  props: {
    children: "slot",
    useDefaultMovie: "boolean",
    columns: "number",
    columnGap: "number",
    rowGap: "number",
  },
  importPath: "./code-components/Movie",
});

PLASMIC.registerComponent(FetchMovie, {
  name: "FetchMovie",
  props: {
    children: "slot",
    id: "number",
  },
  importPath: "./code-components/Movie",
});
