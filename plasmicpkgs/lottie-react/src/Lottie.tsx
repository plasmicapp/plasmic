import { CodeComponentMeta, PlasmicCanvasContext } from "@plasmicapp/host";
import registerComponent from "@plasmicapp/host/registerComponent";
import Lottie, { InteractivityProps } from "lottie-react";
import React, { useContext } from "react";

const isBrowser = typeof window !== "undefined";

const useIsomorphicLayoutEffect = isBrowser
  ? React.useLayoutEffect
  : React.useEffect;

function useIsClient() {
  const [loaded, setLoaded] = React.useState(false);
  useIsomorphicLayoutEffect(() => {
    setLoaded(true);
  }, []);
  return loaded;
}

export const CheckExample = {
  v: "4.10.1",
  fr: 30,
  ip: 0,
  op: 40,
  w: 80,
  h: 80,
  nm: "Success Checkmark",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Check Mark",
      sr: 1,
      ks: {
        o: { a: 0, k: 100, ix: 11 },
        r: { a: 0, k: 0, ix: 10 },
        p: { a: 0, k: [40, 40, 0], ix: 2 },
        a: { a: 0, k: [-1.312, 6, 0], ix: 1 },
        s: { a: 0, k: [100, 100, 100], ix: 6 },
      },
      ao: 0,
      shapes: [
        {
          ty: "gr",
          it: [
            {
              ind: 0,
              ty: "sh",
              ix: 1,
              ks: {
                a: 0,
                k: {
                  i: [
                    [0, 0],
                    [0, 0],
                    [0, 0],
                  ],
                  o: [
                    [0, 0],
                    [0, 0],
                    [0, 0],
                  ],
                  v: [
                    [-15.75, 8],
                    [-8, 16],
                    [13.125, -4],
                  ],
                  c: false,
                },
                ix: 2,
              },
              nm: "Path 1",
              mn: "ADBE Vector Shape - Group",
              hd: false,
            },
            {
              ty: "tm",
              s: {
                a: 1,
                k: [
                  {
                    i: { x: [0.667], y: [1] },
                    o: { x: [0.333], y: [0] },
                    n: ["0p667_1_0p333_0"],
                    t: 25,
                    s: [0],
                    e: [100],
                  },
                  { t: 33 },
                ],
                ix: 1,
              },
              e: { a: 0, k: 0, ix: 2 },
              o: { a: 0, k: 0, ix: 3 },
              m: 1,
              ix: 2,
              nm: "Trim Paths 1",
              mn: "ADBE Vector Filter - Trim",
              hd: false,
            },
            {
              ty: "st",
              c: { a: 0, k: [1, 1, 1, 1], ix: 3 },
              o: { a: 0, k: 100, ix: 4 },
              w: { a: 0, k: 3, ix: 5 },
              lc: 2,
              lj: 2,
              nm: "Stroke 1",
              mn: "ADBE Vector Graphic - Stroke",
              hd: false,
            },
            {
              ty: "tr",
              p: { a: 0, k: [0, 0], ix: 2 },
              a: { a: 0, k: [0, 0], ix: 1 },
              s: { a: 0, k: [100, 100], ix: 3 },
              r: { a: 0, k: 0, ix: 6 },
              o: { a: 0, k: 100, ix: 7 },
              sk: { a: 0, k: 0, ix: 4 },
              sa: { a: 0, k: 0, ix: 5 },
              nm: "Transform",
            },
          ],
          nm: "Shape 1",
          np: 3,
          cix: 2,
          ix: 1,
          mn: "ADBE Vector Group",
          hd: false,
        },
      ],
      ip: 0,
      op: 40,
      st: 0,
      bm: 0,
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: "Circle Flash",
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            {
              i: { x: [0.833], y: [0.833] },
              o: { x: [0.167], y: [0.167] },
              n: ["0p833_0p833_0p167_0p167"],
              t: 25,
              s: [0],
              e: [98],
            },
            {
              i: { x: [0.833], y: [0.833] },
              o: { x: [0.167], y: [0.167] },
              n: ["0p833_0p833_0p167_0p167"],
              t: 30,
              s: [98],
              e: [0],
            },
            { t: 38 },
          ],
          ix: 11,
        },
        r: { a: 0, k: 0, ix: 10 },
        p: { a: 0, k: [40, 40, 0], ix: 2 },
        a: { a: 0, k: [0, 0, 0], ix: 1 },
        s: {
          a: 1,
          k: [
            {
              i: { x: [0.667, 0.667, 0.667], y: [1, 1, 1] },
              o: { x: [0.333, 0.333, 0.333], y: [0, 0, 0] },
              n: ["0p667_1_0p333_0", "0p667_1_0p333_0", "0p667_1_0p333_0"],
              t: 25,
              s: [0, 0, 100],
              e: [100, 100, 100],
            },
            { t: 30 },
          ],
          ix: 6,
        },
      },
      ao: 0,
      shapes: [
        {
          d: 1,
          ty: "el",
          s: { a: 0, k: [64, 64], ix: 2 },
          p: { a: 0, k: [0, 0], ix: 3 },
          nm: "Ellipse Path 1",
          mn: "ADBE Vector Shape - Ellipse",
          hd: false,
        },
        {
          ty: "fl",
          c: {
            a: 0,
            k: [0.529866635799, 0.961458325386, 0.448091417551, 1],
            ix: 4,
          },
          o: { a: 0, k: 100, ix: 5 },
          r: 1,
          nm: "Fill 1",
          mn: "ADBE Vector Graphic - Fill",
          hd: false,
        },
      ],
      ip: 0,
      op: 40,
      st: 0,
      bm: 0,
    },
    {
      ddd: 0,
      ind: 3,
      ty: 4,
      nm: "Circle Stroke",
      sr: 1,
      ks: {
        o: { a: 0, k: 100, ix: 11 },
        r: { a: 0, k: 0, ix: 10 },
        p: { a: 0, k: [39.022, 39.022, 0], ix: 2 },
        a: { a: 0, k: [0, 0, 0], ix: 1 },
        s: {
          a: 1,
          k: [
            {
              i: { x: [0.667, 0.667, 0.667], y: [1, 1, 1] },
              o: { x: [0.333, 0.333, 0.333], y: [0, 0, 0] },
              n: ["0p667_1_0p333_0", "0p667_1_0p333_0", "0p667_1_0p333_0"],
              t: 16,
              s: [100, 100, 100],
              e: [80, 80, 100],
            },
            {
              i: { x: [0.667, 0.667, 0.667], y: [1, 1, 1] },
              o: { x: [0.333, 0.333, 0.333], y: [0, 0, 0] },
              n: ["0p667_1_0p333_0", "0p667_1_0p333_0", "0p667_1_0p333_0"],
              t: 22,
              s: [80, 80, 100],
              e: [120, 120, 100],
            },
            {
              i: { x: [0.667, 0.667, 0.667], y: [1, 1, 1] },
              o: { x: [0.333, 0.333, 0.333], y: [0, 0, 0] },
              n: ["0p667_1_0p333_0", "0p667_1_0p333_0", "0p667_1_0p333_0"],
              t: 25,
              s: [120, 120, 100],
              e: [100, 100, 100],
            },
            { t: 29 },
          ],
          ix: 6,
        },
      },
      ao: 0,
      shapes: [
        {
          ty: "gr",
          it: [
            {
              d: 1,
              ty: "el",
              s: { a: 0, k: [60, 60], ix: 2 },
              p: { a: 0, k: [0, 0], ix: 3 },
              nm: "Ellipse Path 1",
              mn: "ADBE Vector Shape - Ellipse",
              hd: false,
            },
            {
              ty: "tm",
              s: {
                a: 1,
                k: [
                  {
                    i: { x: [0.667], y: [1] },
                    o: { x: [0.333], y: [0] },
                    n: ["0p667_1_0p333_0"],
                    t: 0,
                    s: [0],
                    e: [100],
                  },
                  { t: 16 },
                ],
                ix: 1,
              },
              e: { a: 0, k: 0, ix: 2 },
              o: { a: 0, k: 0, ix: 3 },
              m: 1,
              ix: 2,
              nm: "Trim Paths 1",
              mn: "ADBE Vector Filter - Trim",
              hd: false,
            },
            {
              ty: "st",
              c: {
                a: 0,
                k: [0.427450984716, 0.800000011921, 0.35686275363, 1],
                ix: 3,
              },
              o: { a: 0, k: 100, ix: 4 },
              w: { a: 0, k: 3, ix: 5 },
              lc: 2,
              lj: 2,
              nm: "Stroke 1",
              mn: "ADBE Vector Graphic - Stroke",
              hd: false,
            },
            {
              ty: "tr",
              p: { a: 0, k: [0.978, 0.978], ix: 2 },
              a: { a: 0, k: [0, 0], ix: 1 },
              s: { a: 0, k: [100, 100], ix: 3 },
              r: { a: 0, k: 0, ix: 6 },
              o: { a: 0, k: 100, ix: 7 },
              sk: { a: 0, k: 0, ix: 4 },
              sa: { a: 0, k: 0, ix: 5 },
              nm: "Transform",
            },
          ],
          nm: "Ellipse 1",
          np: 3,
          cix: 2,
          ix: 1,
          mn: "ADBE Vector Group",
          hd: false,
        },
      ],
      ip: 0,
      op: 40,
      st: 0,
      bm: 0,
    },
    {
      ddd: 0,
      ind: 4,
      ty: 4,
      nm: "Circle Green Fill",
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            {
              i: { x: [0.833], y: [0.833] },
              o: { x: [0.167], y: [0.167] },
              n: ["0p833_0p833_0p167_0p167"],
              t: 21,
              s: [0],
              e: [98],
            },
            { t: 28 },
          ],
          ix: 11,
        },
        r: { a: 0, k: 0, ix: 10 },
        p: { a: 0, k: [40, 40, 0], ix: 2 },
        a: { a: 0, k: [0, 0, 0], ix: 1 },
        s: {
          a: 1,
          k: [
            {
              i: { x: [0.667, 0.667, 0.667], y: [1, 1, 1] },
              o: { x: [0.333, 0.333, 0.333], y: [0, 0, 0] },
              n: ["0p667_1_0p333_0", "0p667_1_0p333_0", "0p667_1_0p333_0"],
              t: 21,
              s: [0, 0, 100],
              e: [100, 100, 100],
            },
            { t: 28 },
          ],
          ix: 6,
        },
      },
      ao: 0,
      shapes: [
        {
          d: 1,
          ty: "el",
          s: { a: 0, k: [64, 64], ix: 2 },
          p: { a: 0, k: [0, 0], ix: 3 },
          nm: "Ellipse Path 1",
          mn: "ADBE Vector Shape - Ellipse",
          hd: false,
        },
        {
          ty: "fl",
          c: {
            a: 0,
            k: [0.427450984716, 0.800000011921, 0.35686275363, 1],
            ix: 4,
          },
          o: { a: 0, k: 100, ix: 5 },
          r: 1,
          nm: "Fill 1",
          mn: "ADBE Vector Graphic - Fill",
          hd: false,
        },
      ],
      ip: 0,
      op: 40,
      st: 0,
      bm: 0,
    },
  ],
};
interface CommonLottieWrapperProps {
  className?: string;
  animationData?: {};
  loop?: boolean;
  autoplay?: boolean;
  preview?: boolean;
  interactivity?: Omit<InteractivityProps, "lottieObj"> | undefined;
}

export interface LottieWrapperProps extends CommonLottieWrapperProps {
  animationData?: {};
}
export interface AsyncLottieWrapperProps extends CommonLottieWrapperProps {
  animationUrl?: string;
}

export function LottieWrapper({
  className,
  animationData,
  interactivity,
  loop = true,
  autoplay = true,
  preview = false,
}: LottieWrapperProps) {
  const inEditor = useContext(PlasmicCanvasContext);
  const isClient = useIsClient();
  if (!isClient) {
    return null;
  }
  if (!animationData) {
    throw new Error("animationData is required");
  }
  return (
    <React.Suspense fallback={<></>}>
      <Lottie
        className={className}
        animationData={animationData}
        interactivity={interactivity}
        loop={loop}
        autoplay={inEditor ? preview : autoplay}
      />
    </React.Suspense>
  );
}

const PROMISE_CACHE: Record<string, Promise<any>> = {};
const DATA_CACHE: Record<string, any> = {};

async function fetchAnimationData(url: string) {
  if (url in DATA_CACHE) {
    return DATA_CACHE[url];
  } else if (url in PROMISE_CACHE) {
    return PROMISE_CACHE[url];
  } else {
    PROMISE_CACHE[url] = (async () => {
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(
          `Error downloading Lottie animation from ${url}: ${resp.statusText}`
        );
      }
      const json = await resp.json();
      // Only delete from PROMISE_CACHE upon success
      delete PROMISE_CACHE[url];
      return json;
    })();
    return PROMISE_CACHE[url];
  }
}

export function AsyncLottieWrapper({
  className,
  animationUrl,
  interactivity,
  loop = true,
  autoplay = true,
  preview = false,
}: AsyncLottieWrapperProps) {
  const inEditor = useContext(PlasmicCanvasContext);
  const [data, setData] = React.useState<any | undefined>(
    animationUrl ? DATA_CACHE[animationUrl] : undefined
  );
  const [error, setError] = React.useState<any | undefined>(undefined);
  React.useEffect(() => {
    if (animationUrl) {
      fetchAnimationData(animationUrl).then(
        (res) => {
          setData(res);
        },
        (err) => {
          setError(err);
        }
      );
    }
  }, [animationUrl]);
  const isClient = useIsClient();
  if (!isClient) {
    return null;
  }
  if (!animationUrl) {
    throw new Error("animationUrl is required");
  }
  if (error) {
    throw error;
  }

  if (!data) {
    return <div className={className} />;
  } else {
    return (
      <Lottie
        className={className}
        animationData={data}
        interactivity={interactivity}
        loop={loop}
        autoplay={inEditor ? preview : autoplay}
      />
    );
  }
}

export function registerLottieWrapper(loader?: {
  registerComponent: typeof registerComponent;
}) {
  const commonProps: CodeComponentMeta<CommonLottieWrapperProps>["props"] = {
    interactivity: {
      type: "object",
      description: "Animation interactivity JSON data",
      helpText:
        "For more information on interactivity, visit the Lottie React [documentation](https://lottiereact.com/components/Lottie#interactivity-1)",
    },
    loop: {
      type: "boolean",
      description: "Whether to loop the animation",
      defaultValueHint: true,
    },
    autoplay: {
      type: "boolean",
      description: "Whether to autoplay the animation",
      defaultValueHint: true,
    },
    preview: {
      type: "boolean",
      description: "Whether to preview the animation in the editor",
      defaultValueHint: false,
    },
  };

  const register = <T extends React.ComponentType<any>>(
    component: T,
    meta: CodeComponentMeta<React.ComponentProps<T>>
  ) => {
    if (loader) {
      loader.registerComponent(component, meta);
    } else {
      registerComponent(component, meta);
    }
  };

  register(LottieWrapper, {
    name: "hostless-lottie-react",
    displayName: "Lottie",
    importName: "LottieWrapper",
    importPath: "@plasmicpkgs/lottie-react",
    props: {
      animationData: {
        type: "object",
        description: "The animation JSON data",
        defaultValue: CheckExample,
      },
      ...(commonProps as any),
    },
  });

  register(AsyncLottieWrapper, {
    name: "hostless-lottie-async-react",
    displayName: "Lottie Async",
    importName: "AsyncLottieWrapper",
    importPath: "@plasmicpkgs/lottie-react",
    props: {
      animationUrl: {
        displayName: "Animation URL",
        type: "string",
        description: "URL from which to download Lottie JSON data",
      },
      ...(commonProps as any),
    },
  });
}
