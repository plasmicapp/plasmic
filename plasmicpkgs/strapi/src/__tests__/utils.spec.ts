import {
  StrapiItemV4,
  StrapiItemV5,
  StrapiQueryResponse,
} from "../strapi-compat";
import {
  extractDisplayableFields,
  extractFilterableFields,
  transformMediaUrls,
} from "../utils";

const strapiResponseV4: StrapiQueryResponse = {
  data: [
    {
      id: 1,
      attributes: {
        title: "Pirate Pat",
        isPublished: true,
        description: [
          {
            type: "paragraph",
            children: [
              {
                type: "text",
                text: "Its a story about a pirate.",
              },
            ],
          },
        ],
        metadata: {
          barCode: "123121",
          public: true,
        },
        pageCount: 20,
        contactEmail: null,
        genre: "children",
        createdAt: "2025-10-17T16:46:54.303Z",
        updatedAt: "2025-10-17T17:07:23.352Z",
        publishedAt: "2025-10-17T16:51:34.397Z",
        summary: "The pirate finds a treasure chest",
        cover: {
          data: {
            id: 3,
            attributes: {
              name: "img-1",
              alternativeText: null,
              caption: null,
              width: 2984,
              height: 1600,
              formats: {
                thumbnail: {
                  name: "thumbnail_img-1",
                  hash: "thumbnail_img_1_7815086d15",
                  ext: ".png",
                  mime: "image/png",
                  path: null,
                  width: 245,
                  height: 131,
                  size: 30.15,
                  sizeInBytes: 30151,
                  url: "/uploads/thumbnail_img_1_7815086d15.png",
                },
                small: {
                  name: "small_img-1",
                  hash: "small_img_1_7815086d15",
                  ext: ".png",
                  mime: "image/png",
                  path: null,
                  width: 500,
                  height: 268,
                  size: 82.58,
                  sizeInBytes: 82581,
                  url: "/uploads/small_img_1_7815086d15.png",
                },
                medium: {
                  name: "medium_img-1",
                  hash: "medium_img_1_7815086d15",
                  ext: ".png",
                  mime: "image/png",
                  path: null,
                  width: 750,
                  height: 402,
                  size: 140.02,
                  sizeInBytes: 140022,
                  url: "/uploads/medium_img_1_7815086d15.png",
                },
                large: {
                  name: "large_img-1",
                  hash: "large_img_1_7815086d15",
                  ext: ".png",
                  mime: "image/png",
                  path: null,
                  width: 1000,
                  height: 536,
                  size: 206.74,
                  sizeInBytes: 206744,
                  url: "/uploads/large_img_1_7815086d15.png",
                },
              },
              hash: "img_1_7815086d15",
              ext: ".png",
              mime: "image/png",
              size: 136.06,
              url: "/uploads/img_1_7815086d15.png",
              previewUrl: null,
              provider: "local",
              provider_metadata: null,
              createdAt: "2025-10-17T16:45:58.270Z",
              updatedAt: "2025-10-17T16:45:58.270Z",
            },
          },
        },
        gallery: {
          data: [
            {
              id: 2,
              attributes: {
                name: "img-3",
                alternativeText: null,
                caption: null,
                width: 545,
                height: 144,
                formats: {
                  thumbnail: {
                    name: "thumbnail_img-3",
                    hash: "thumbnail_img_3_6383b65f09",
                    ext: ".png",
                    mime: "image/png",
                    path: null,
                    width: 245,
                    height: 65,
                    size: 5.92,
                    sizeInBytes: 5915,
                    url: "/uploads/thumbnail_img_3_6383b65f09.png",
                  },
                  small: {
                    name: "small_img-3",
                    hash: "small_img_3_6383b65f09",
                    ext: ".png",
                    mime: "image/png",
                    path: null,
                    width: 500,
                    height: 132,
                    size: 14.54,
                    sizeInBytes: 14539,
                    url: "/uploads/small_img_3_6383b65f09.png",
                  },
                },
                hash: "img_3_6383b65f09",
                ext: ".png",
                mime: "image/png",
                size: 3.33,
                url: "/uploads/img_3_6383b65f09.png",
                previewUrl: null,
                provider: "local",
                provider_metadata: null,
                createdAt: "2025-10-17T16:45:57.908Z",
                updatedAt: "2025-10-17T16:45:57.908Z",
              },
            },
          ],
        },
        reviews: {
          data: [
            {
              id: 1,
              attributes: {
                country: "Russia",
                message: "Very good",
                rating: 4.5,
                createdAt: "2025-10-17T16:48:31.173Z",
                updatedAt: "2025-10-17T16:51:41.132Z",
                publishedAt: "2025-10-17T16:51:41.131Z",
              },
            },
            {
              id: 2,
              attributes: {
                country: "Portugal",
                message: "Didn't like it",
                rating: 2.5,
                createdAt: "2025-10-17T16:48:55.051Z",
                updatedAt: "2025-10-17T17:21:16.128Z",
                publishedAt: "2025-10-17T16:51:38.441Z",
              },
            },
          ],
        },
        author: {
          data: {
            id: 1,
            attributes: {
              name: "Mairi",
              createdAt: "2025-10-17T16:49:20.527Z",
              updatedAt: "2025-10-17T17:21:01.361Z",
              publishedAt: "2025-10-17T16:51:30.343Z",
            },
          },
        },
      },
    },
  ] as StrapiItemV4[],
  meta: {
    pagination: {
      page: 1,
      pageSize: 25,
      pageCount: 1,
      total: 1,
    },
  },
};

const strapiResponseV5: StrapiQueryResponse = {
  data: [
    {
      id: 8,
      documentId: "eul9r5vy9p4a47jto7gt77wg",
      title: "Pirate Pat",
      createdAt: "2025-10-17T11:20:09.510Z",
      updatedAt: "2025-10-17T17:16:59.087Z",
      publishedAt: "2025-10-17T17:16:59.098Z",
      description: [
        {
          type: "paragraph",
          children: [
            {
              type: "text",
              text: "Its a story about a pirate.",
            },
          ],
        },
      ],
      metadata: {
        barCode: "123121",
        public: true,
      },
      contactEmail: null,
      genre: "children",
      isPublished: true,
      summary: "The pirate finds a treasure chest",
      pageCount: 20,
      cover: {
        id: 3,
        documentId: "b0ytj5qmdi65cnn596yekxiw",
        name: "img-4",
        alternativeText: null,
        caption: null,
        width: 830,
        height: 882,
        formats: {
          thumbnail: {
            name: "thumbnail_img-4",
            hash: "thumbnail_img_4_01584f4bef",
            ext: ".png",
            mime: "image/png",
            path: null,
            width: 147,
            height: 156,
            size: 45.42,
            sizeInBytes: 45416,
            url: "/uploads/thumbnail_img_4_01584f4bef.png",
          },
          small: {
            name: "small_img-4",
            hash: "small_img_4_01584f4bef",
            ext: ".png",
            mime: "image/png",
            path: null,
            width: 471,
            height: 500,
            size: 321.89,
            sizeInBytes: 321893,
            url: "/uploads/small_img_4_01584f4bef.png",
          },
          medium: {
            name: "medium_img-4",
            hash: "medium_img_4_01584f4bef",
            ext: ".png",
            mime: "image/png",
            path: null,
            width: 706,
            height: 750,
            size: 650.42,
            sizeInBytes: 650423,
            url: "/uploads/medium_img_4_01584f4bef.png",
          },
        },
        hash: "img_4_01584f4bef",
        ext: ".png",
        mime: "image/png",
        size: 216.46,
        url: "/uploads/img_4_01584f4bef.png",
        previewUrl: null,
        provider: "local",
        provider_metadata: null,
        createdAt: "2025-10-17T16:31:48.046Z",
        updatedAt: "2025-10-17T16:31:48.046Z",
        publishedAt: "2025-10-17T16:31:48.046Z",
      },
      author: {
        id: 3,
        documentId: "vo3047l7wo2o17wbizxx31pt",
        createdAt: "2025-10-17T17:06:00.646Z",
        updatedAt: "2025-10-17T17:19:07.195Z",
        publishedAt: "2025-10-17T17:19:07.204Z",
        name: "Mairi",
        avatar: {
          id: 6,
          documentId: "i0rhr2tw6f7pw3fuhcvf0lg3",
          name: "img-5",
          alternativeText: null,
          caption: null,
          width: 2984,
          height: 1600,
          formats: {
            thumbnail: {
              name: "thumbnail_img-5",
              hash: "thumbnail_img_5_5c36f67928",
              ext: ".png",
              mime: "image/png",
              path: null,
              width: 245,
              height: 131,
              size: 30.07,
              sizeInBytes: 30070,
              url: "/uploads/thumbnail_img_5_5c36f67928.png",
            },
          },
          hash: "img_5_5c36f67928",
          ext: ".png",
          mime: "image/png",
          size: 138.84,
          url: "/uploads/img_5_5c36f67928.png",
          previewUrl: null,
          provider: "local",
          provider_metadata: null,
          createdAt: "2025-10-17T16:35:32.366Z",
          updatedAt: "2025-10-17T16:35:32.366Z",
          publishedAt: "2025-10-17T16:35:32.367Z",
        },
      },
      reviews: [
        {
          id: 2,
          documentId: "g04b1akdvjk8akk90hflzcux",
          country: "Russia",
          message: "Test review 1",
          createdAt: "2025-10-17T16:26:34.487Z",
          updatedAt: "2025-10-17T16:26:34.487Z",
          publishedAt: "2025-10-17T16:26:34.493Z",
          rating: 3.5,
        },
        {
          id: 5,
          documentId: "uiiiivx3v39ihgq9dwv719ct",
          country: "Portugal",
          message: "Didn't like it much",
          createdAt: "2025-10-17T16:27:14.229Z",
          updatedAt: "2025-10-17T17:19:23.643Z",
          publishedAt: "2025-10-17T17:19:23.650Z",
          rating: 2,
          pictures: [
            {
              id: 5,
              documentId: "xwqggvedpolkw0bfxpr15e8i",
              name: "img-7",
              alternativeText: null,
              caption: null,
              width: 545,
              height: 144,
              formats: {
                thumbnail: {
                  name: "thumbnail_img-7",
                  hash: "thumbnail_img_7_7f781b3cf6",
                  ext: ".png",
                  mime: "image/png",
                  path: null,
                  width: 245,
                  height: 65,
                  size: 5.96,
                  sizeInBytes: 5964,
                  url: "/uploads/thumbnail_img_7_7f781b3cf6.png",
                },
              },
              hash: "img_7_7f781b3cf6",
              ext: ".png",
              mime: "image/png",
              size: 3.46,
              url: "/uploads/img_7_7f781b3cf6.png",
              previewUrl: null,
              provider: "local",
              provider_metadata: null,
              createdAt: "2025-10-17T16:35:32.025Z",
              updatedAt: "2025-10-17T16:35:32.025Z",
              publishedAt: "2025-10-17T16:35:32.026Z",
            },
          ],
        },
      ],
      gallery: [
        {
          id: 4,
          documentId: "l6ucdphqjmxjq4vqk9qnjpkw",
          name: "img-6",
          alternativeText: null,
          caption: null,
          width: 451,
          height: 177,
          formats: {
            thumbnail: {
              name: "thumbnail_img-6",
              hash: "thumbnail_img_6_8535649ae7",
              ext: ".png",
              mime: "image/png",
              path: null,
              width: 245,
              height: 96,
              size: 9.62,
              sizeInBytes: 9616,
              url: "/uploads/thumbnail_img_6_8535649ae7.png",
            },
          },
          hash: "img_6_8535649ae7",
          ext: ".png",
          mime: "image/png",
          size: 4.47,
          url: "/uploads/img_6_8535649ae7.png",
          previewUrl: null,
          provider: "local",
          provider_metadata: null,
          createdAt: "2025-10-17T16:35:32.018Z",
          updatedAt: "2025-10-17T16:35:32.018Z",
          publishedAt: "2025-10-17T16:35:32.019Z",
        },
      ],
    },
  ] as StrapiItemV5[],
  meta: {
    pagination: {
      page: 1,
      pageSize: 25,
      pageCount: 1,
      total: 1,
    },
  },
};

describe("extractDisplayableFields", () => {
  test("v4 format", () => {
    const result = extractDisplayableFields(strapiResponseV4.data[0]);
    // Arrays are excluded
    expect(result).not.toContain("gallery");
    expect(result).not.toContain("reviews");
    expect(result).not.toContain("description");
    // Non-media relations are excluded
    expect(result).not.toContain("author");
    // non-primitives are excluded
    expect(result).not.toContain("metadata");
    // nulls are excluded
    expect(result).not.toContain("contactEmail");
    expect(result).toEqual([
      "title",
      "isPublished",
      "pageCount",
      "genre",
      "createdAt",
      "updatedAt",
      "publishedAt",
      "summary",
      "cover",
    ]);
  });

  test("v5 format", () => {
    const result = extractDisplayableFields(strapiResponseV5.data[0]);
    // Arrays are excluded
    expect(result).not.toContain("gallery");
    expect(result).not.toContain("reviews");
    expect(result).not.toContain("description");
    // Non-media relations are excluded
    expect(result).not.toContain("author");
    // non-primitives are excluded
    expect(result).not.toContain("metadata");
    // nulls are excluded
    expect(result).not.toContain("contactEmail");
    expect(result).toEqual([
      "id",
      "title",
      "createdAt",
      "updatedAt",
      "publishedAt",
      "genre",
      "isPublished",
      "summary",
      "pageCount",
      "cover",
    ]);
  });
});

describe("extractFilterableFields", () => {
  test("v4 format", () => {
    const result = extractFilterableFields(strapiResponseV4.data[0]);
    // Arrays are excluded
    expect(result).not.toContain("gallery");
    expect(result).not.toContain("reviews");
    expect(result).not.toContain("description");
    // Non-media relations are excluded
    expect(result).not.toContain("author");
    // non-primitives are excluded
    expect(result).not.toContain("metadata");
    // nulls are excluded
    expect(result).not.toContain("contactEmail");
    // media relations are also excluded
    expect(result).not.toContain("cover");
    // only primitive types included in the result
    expect(result).toEqual([
      "title",
      "isPublished",
      "pageCount",
      "genre",
      "createdAt",
      "updatedAt",
      "publishedAt",
      "summary",
    ]);
  });

  test("v5 format", () => {
    const result = extractFilterableFields(strapiResponseV5.data[0]);
    // Arrays are excluded
    expect(result).not.toContain("gallery");
    expect(result).not.toContain("reviews");
    expect(result).not.toContain("description");
    // Non-media relations are excluded
    expect(result).not.toContain("author");
    // non-primitives are excluded
    expect(result).not.toContain("metadata");
    // nulls are excluded
    expect(result).not.toContain("contactEmail");
    // media relations are also excluded
    expect(result).not.toContain("cover");
    // only primitive types included in the result
    expect(result).toEqual([
      "id",
      "title",
      "createdAt",
      "updatedAt",
      "publishedAt",
      "genre",
      "isPublished",
      "summary",
      "pageCount",
    ]);
  });
});

describe("transformMediaUrls", () => {
  const HOST = "https://example.com";

  it("v4 format", () => {
    const expected = structuredClone(strapiResponseV4);
    const coverAttrs = (expected.data[0] as any).attributes.cover.data
      .attributes;
    coverAttrs.absoluteUrl = "https://example.com/uploads/img_1_7815086d15.png";
    coverAttrs.formats.thumbnail.absoluteUrl =
      "https://example.com/uploads/thumbnail_img_1_7815086d15.png";
    coverAttrs.formats.small.absoluteUrl =
      "https://example.com/uploads/small_img_1_7815086d15.png";
    coverAttrs.formats.medium.absoluteUrl =
      "https://example.com/uploads/medium_img_1_7815086d15.png";
    coverAttrs.formats.large.absoluteUrl =
      "https://example.com/uploads/large_img_1_7815086d15.png";

    const galleryAttrs = (expected.data[0] as any).attributes.gallery.data[0]
      .attributes;
    galleryAttrs.absoluteUrl =
      "https://example.com/uploads/img_3_6383b65f09.png";
    galleryAttrs.formats.thumbnail.absoluteUrl =
      "https://example.com/uploads/thumbnail_img_3_6383b65f09.png";
    galleryAttrs.formats.small.absoluteUrl =
      "https://example.com/uploads/small_img_3_6383b65f09.png";

    expect(transformMediaUrls(strapiResponseV4, HOST)).toEqual(expected);
  });

  it("v5 format", () => {
    const expected = structuredClone(strapiResponseV5);
    const cover = (expected.data[0] as any).cover;
    cover.absoluteUrl = "https://example.com/uploads/img_4_01584f4bef.png";
    cover.formats.thumbnail.absoluteUrl =
      "https://example.com/uploads/thumbnail_img_4_01584f4bef.png";
    cover.formats.small.absoluteUrl =
      "https://example.com/uploads/small_img_4_01584f4bef.png";
    cover.formats.medium.absoluteUrl =
      "https://example.com/uploads/medium_img_4_01584f4bef.png";

    const avatar = (expected.data[0] as any).author.avatar;
    avatar.absoluteUrl = "https://example.com/uploads/img_5_5c36f67928.png";
    avatar.formats.thumbnail.absoluteUrl =
      "https://example.com/uploads/thumbnail_img_5_5c36f67928.png";

    const reviewPicture = (expected.data[0] as any).reviews[1].pictures[0];
    reviewPicture.absoluteUrl =
      "https://example.com/uploads/img_7_7f781b3cf6.png";
    reviewPicture.formats.thumbnail.absoluteUrl =
      "https://example.com/uploads/thumbnail_img_7_7f781b3cf6.png";

    const galleryImage = (expected.data[0] as any).gallery[0];
    galleryImage.absoluteUrl =
      "https://example.com/uploads/img_6_8535649ae7.png";
    galleryImage.formats.thumbnail.absoluteUrl =
      "https://example.com/uploads/thumbnail_img_6_8535649ae7.png";

    expect(transformMediaUrls(strapiResponseV5, HOST)).toEqual(expected);
  });

  describe("edge cases", () => {
    it("should handle empty data array", () => {
      const data: StrapiQueryResponse = {
        data: [],
        meta: {
          pagination: { page: 1, pageSize: 25, pageCount: 0, total: 0 },
        },
      };

      const result = transformMediaUrls(data, HOST);
      expect(result.data).toEqual([]);
    });

    it("should normalize host and URL slashes", () => {
      const data: StrapiQueryResponse = {
        data: [
          {
            documentId: "abc123",
            image: {
              documentId: "img456",
              url: "uploads/photo.jpg", // No leading slash
              width: 800,
              height: 600,
              mime: "image/jpeg",
              ext: "png",
              size: 123,
            },
          },
        ],
        meta: {
          pagination: { page: 1, pageSize: 25, pageCount: 1, total: 1 },
        },
      };

      const host = HOST + "/"; // add a trailing slash
      const result = transformMediaUrls(data, host);

      const image = (result.data[0] as any).image;
      expect(image.url).toBe("uploads/photo.jpg"); // Original URL unchanged
      expect(image.absoluteUrl).toBe("https://example.com/uploads/photo.jpg"); // Normalized
    });
  });
});
