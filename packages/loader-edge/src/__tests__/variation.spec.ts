import {
  generateAllPaths,
  generateAllPathsWithTraits,
  getMiddlewareResponse,
  rewriteWithoutTraits,
  rewriteWithTraits,
} from "../index";
import { DELIMITER, PLASMIC_SEED } from "../variation";

describe("Variation", () => {
  describe("generateAllPathsWithTraits", () => {
    it("should generate all paths with plasmic seed", () => {
      const pathList = generateAllPaths("/", 4);
      expect(pathList.length).toBe(5);
      expect(pathList).toEqual(
        expect.arrayContaining([
          "/",
          `/${DELIMITER}${PLASMIC_SEED}=0`,
          `/${DELIMITER}${PLASMIC_SEED}=1`,
          `/${DELIMITER}${PLASMIC_SEED}=2`,
          `/${DELIMITER}${PLASMIC_SEED}=3`,
        ])
      );

      const pathList2 = generateAllPaths("/home", 3);
      expect(pathList2.length).toBe(4);
      expect(pathList2).toEqual(
        expect.arrayContaining([
          "/home",
          `/home/${DELIMITER}${PLASMIC_SEED}=0`,
          `/home/${DELIMITER}${PLASMIC_SEED}=1`,
          `/home/${DELIMITER}${PLASMIC_SEED}=2`,
        ])
      );

      const pathList3 = generateAllPaths("/faq/", 3);
      expect(pathList3.length).toBe(4);
      expect(pathList3).toEqual(
        expect.arrayContaining([
          "/faq/",
          `/faq/${DELIMITER}${PLASMIC_SEED}=0`,
          `/faq/${DELIMITER}${PLASMIC_SEED}=1`,
          `/faq/${DELIMITER}${PLASMIC_SEED}=2`,
        ])
      );
    });

    it("should generate all paths with plasmic seed and traits", () => {
      const pathList = generateAllPathsWithTraits(
        "/",
        {
          source: ["google", "facebook"],
          browser: ["chrome", "safari"],
        },
        2
      );
      expect(pathList.length).toBe(27);
      const seeds = [
        `${DELIMITER}${PLASMIC_SEED}=0`,
        `${DELIMITER}${PLASMIC_SEED}=1`,
      ];
      const sources = [
        `${DELIMITER}source=google`,
        `${DELIMITER}source=facebook`,
      ];
      const browsers = [
        `${DELIMITER}browser=chrome`,
        `${DELIMITER}browser=safari`,
      ];
      expect(pathList).toEqual(
        expect.arrayContaining([
          "/",
          `/${seeds[0]}`,
          `/${seeds[1]}`,
          `/${sources[0]}`,
          `/${sources[1]}`,
          `/${browsers[0]}`,
          `/${browsers[1]}`,
          `/${browsers[0]}${sources[0]}`,
          `/${browsers[0]}${sources[1]}`,
          `/${browsers[1]}${sources[0]}`,
          `/${browsers[1]}${sources[1]}`,
          `/${browsers[0]}${seeds[0]}`,
          `/${browsers[0]}${seeds[1]}`,
          `/${browsers[1]}${seeds[0]}`,
          `/${browsers[1]}${seeds[1]}`,
          `/${seeds[0]}${sources[0]}`,
          `/${seeds[0]}${sources[1]}`,
          `/${seeds[1]}${sources[0]}`,
          `/${seeds[1]}${sources[1]}`,
          `/${browsers[0]}${seeds[0]}${sources[0]}`,
          `/${browsers[0]}${seeds[0]}${sources[1]}`,
          `/${browsers[0]}${seeds[1]}${sources[0]}`,
          `/${browsers[0]}${seeds[1]}${sources[1]}`,
          `/${browsers[1]}${seeds[0]}${sources[0]}`,
          `/${browsers[1]}${seeds[0]}${sources[1]}`,
          `/${browsers[1]}${seeds[1]}${sources[0]}`,
          `/${browsers[1]}${seeds[1]}${sources[1]}`,
        ])
      );
    });

    it("should generate all paths without plasmic seed", () => {
      const pathList = generateAllPaths("/", 0);
      expect(pathList.length).toBe(1);
      expect(pathList).toEqual(expect.arrayContaining(["/"]));

      const pathList2 = generateAllPaths("/home", 0);
      expect(pathList2.length).toBe(1);
      expect(pathList2).toEqual(expect.arrayContaining(["/home"]));

      const pathList3 = generateAllPathsWithTraits(
        "/faq/",
        {
          source: ["google", "facebook"],
        },
        0
      );
      expect(pathList3.length).toBe(3);
      expect(pathList3).toEqual(
        expect.arrayContaining([
          "/faq/",
          `/faq/${DELIMITER}source=google`,
          `/faq/${DELIMITER}source=facebook`,
        ])
      );
    });
  });

  describe("rewriteWithTraits", () => {
    it("should rewrite path with traits", () => {
      expect(rewriteWithTraits("/", {})).toBe("/");
      expect(rewriteWithTraits("/home", {})).toBe("/home");
      expect(rewriteWithTraits("/home/", {})).toBe("/home/");
      expect(rewriteWithTraits("/home", { utm_source: "google" })).toBe(
        `/home/${DELIMITER}utm_source=google`
      );
      expect(rewriteWithTraits("/home/", { utm_source: "google" })).toBe(
        `/home/${DELIMITER}utm_source=google`
      );
      expect(
        rewriteWithTraits("/home", {
          utm_source: "google",
          campaign: "mkt2023",
        })
      ).toBe(`/home/${DELIMITER}campaign=mkt2023${DELIMITER}utm_source=google`);
      expect(
        rewriteWithTraits("/home/", {
          utm_source: "google",
          campaign: "mkt2023",
        })
      ).toBe(`/home/${DELIMITER}campaign=mkt2023${DELIMITER}utm_source=google`);
    });
  });

  describe("rewriteWithoutTraits", () => {
    it("should rewrite path without traits", () => {
      expect(rewriteWithoutTraits("/")).toEqual({ path: "/", traits: {} });
      expect(rewriteWithoutTraits("/home")).toEqual({
        path: "/home",
        traits: {},
      });
      expect(rewriteWithoutTraits("/home/")).toEqual({
        path: "/home",
        traits: {},
      });
      expect(
        rewriteWithoutTraits(`/home/${DELIMITER}utm_source=google`)
      ).toEqual({
        path: "/home",
        traits: { utm_source: "google" },
      });
      expect(
        rewriteWithoutTraits(
          `/home/${DELIMITER}utm_source=google${DELIMITER}campaign=mkt2023`
        )
      ).toEqual({
        path: "/home",
        traits: { utm_source: "google", campaign: "mkt2023" },
      });
    });
  });

  describe("getMiddlewareResponse", () => {
    it("should generate a new pathname and cookies", () => {
      expect(
        getMiddlewareResponse({
          path: "/",
          traits: {},
          cookies: {},
        })
      ).toEqual(
        expect.objectContaining({
          pathname: expect.stringMatching(
            new RegExp(`^/${DELIMITER}${PLASMIC_SEED}=\\d+$`)
          ),
          cookies: expect.arrayContaining([
            expect.objectContaining({
              key: PLASMIC_SEED,
              value: expect.stringMatching(/\d+/),
            }),
          ]),
        })
      );

      expect(
        getMiddlewareResponse({
          path: "/",
          traits: {},
          cookies: {},
          seedRange: 0,
        })
      ).toEqual(
        expect.objectContaining({
          pathname: "/",
          cookies: [],
        })
      );

      expect(
        getMiddlewareResponse({
          path: "/",
          traits: {
            source: "google",
          },
          cookies: {},
          seedRange: 1,
        })
      ).toEqual(
        expect.objectContaining({
          pathname: `/${DELIMITER}${PLASMIC_SEED}=0${DELIMITER}source=google`,
          cookies: [
            {
              key: PLASMIC_SEED,
              value: "0",
            },
          ],
        })
      );

      expect(
        getMiddlewareResponse({
          path: "/",
          traits: {
            source: "google",
          },
          cookies: {
            [PLASMIC_SEED]: "8",
          },
        })
      ).toEqual(
        expect.objectContaining({
          pathname: `/${DELIMITER}${PLASMIC_SEED}=8${DELIMITER}source=google`,
          cookies: [],
        })
      );
    });
  });
});
