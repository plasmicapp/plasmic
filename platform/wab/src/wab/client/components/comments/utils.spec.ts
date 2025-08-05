import {
  TplCommentThread,
  TplCommentThreads,
  computeCommentStats,
  getSubjectVariantsKey,
} from "@/wab/client/components/comments/utils";
import { ApiComment } from "@/wab/shared/ApiSchema";
import * as Components from "@/wab/shared/core/components";
import { ComponentType } from "@/wab/shared/core/components";
import * as Tpls from "@/wab/shared/core/tpls";
import { StateParam, TplNode } from "@/wab/shared/model/classes";
import {
  mkBaseVariant,
  mkComponentVariantGroup,
  mkVariant,
} from "@/wab/shared/Variants";
import * as STpls from "@/wab/test/tpls";

describe("computeCommentStats", () =>
  it("should correctly compute comment stats", function () {
    const xs1: TplNode[] = [];
    const xs2: TplNode[] = [];

    xs1[0] = Tpls.mkTplTag("div", [
      (xs1[1] = STpls.mkTplTestText("hello")),
      (xs1[2] = Tpls.mkTplTag("span")),
      (xs2[3] = Tpls.mkTplTag("span")),
      (xs2[4] = STpls.mkTplTestText("goodbye")),
    ]);

    xs2[0] = Tpls.mkTplTag("div", [
      (xs2[1] = STpls.mkTplTestText("hello")),
      (xs2[2] = Tpls.mkTplTag("span")),
      (xs2[3] = Tpls.mkTplTag("span")),
      (xs2[4] = STpls.mkTplTestText("goodbye")),
    ]);

    const v0 = mkBaseVariant();
    const v1SingleChoiceVariants = [0, 1, 2].map((i) => {
      return mkVariant({
        name: `v1-single-variant${i}`,
      });
    });

    const v1SingleGroup = mkComponentVariantGroup({
      // The param is neglible for this test
      param: {} as StateParam,
      multi: false,
      variants: v1SingleChoiceVariants,
    });

    const component1 = Components.mkComponent({
      name: "my component1",
      type: ComponentType.Plain,
      tplTree: xs1[0],
      variants: [v0],
      variantGroups: [v1SingleGroup],
    });

    Tpls.trackComponentRoot(component1);

    const v2SingleChoiceVariants = [0, 1, 2].map((i) => {
      return mkVariant({
        name: `v2-single-variant${i}`,
      });
    });

    const v2SingleGroup = mkComponentVariantGroup({
      // The param is neglible for this test
      param: {} as StateParam,
      multi: false,
      variants: v2SingleChoiceVariants,
    });

    const component2 = Components.mkComponent({
      name: "my component2",
      type: ComponentType.Plain,
      tplTree: xs2[0],
      variants: [v0],
      variantGroups: [v2SingleGroup],
    });

    Tpls.trackComponentRoot(component2);

    const commentThreads: TplCommentThreads = [
      {
        id: "5adfa1dd-57b4-4e25-9e1d-da71674711b2",
        subjectInfo: {
          subject: xs1[1],
          variants: [v0],
        },
        resolved: false,
        comments: [
          {
            id: "688f1b66-425e-4589-b855-93a043b3b020",
            commentThreadId: "5adfa1dd-57b4-4e25-9e1d-da71674711b2",
            body: "test",
          } as ApiComment,
          {
            id: "5998a352-b1fe-4176-a9c0-0de8842968fe",
            commentThreadId: "5adfa1dd-57b4-4e25-9e1d-da71674711b2",
            body: "test 2",
          } as ApiComment,
          {
            id: "18f1fdfb-700a-4ac7-89f4-07f84388d804",
            commentThreadId: "5adfa1dd-57b4-4e25-9e1d-da71674711b2",
            body: "test 2",
          } as ApiComment,
        ],
      } as TplCommentThread,
      {
        id: "6adfa1dd-57b4-4e25-9e1d-da71674711b2",
        subjectInfo: {
          subject: xs1[2],
          variants: [v1SingleChoiceVariants[0]],
        },
        resolved: false,
        comments: [
          {
            id: "688f1b66-425e-4589-b855-93a043b3b020",
            commentThreadId: "6adfa1dd-57b4-4e25-9e1d-da71674711b2",
            body: "test",
          } as ApiComment,
        ],
      } as TplCommentThread,
      {
        id: "7adfa1dd-57b4-4e25-9e1d-da71674711b2",
        subjectInfo: {
          subject: xs2[3],
          variants: [v0],
        },
        resolved: false,
        comments: [
          {
            id: "688f1b66-425e-4589-b855-93a043b3b020",
            commentThreadId: "7adfa1dd-57b4-4e25-9e1d-da71674711b2",
            body: "test",
          } as ApiComment,
          {
            id: "5998a352-b1fe-4176-a9c0-0de8842968fe",
            commentThreadId: "7adfa1dd-57b4-4e25-9e1d-da71674711b2",
            body: "test 2",
          } as ApiComment,
        ],
      } as TplCommentThread,
      {
        id: "8adfa1dd-57b4-4e25-9e1d-da71674711b2",
        subjectInfo: {
          subject: xs2[4],
          variants: [v0],
        },
        resolved: false,
        comments: [
          {
            id: "688f1b66-425e-4589-b855-93a043b3b020",
            commentThreadId: "8adfa1dd-57b4-4e25-9e1d-da71674711b2",
            body: "test",
          } as ApiComment,
        ],
      } as TplCommentThread,
      {
        id: "5adfa1dd-57b4-4e25-9e1d-da71674711b3",
        subjectInfo: {
          subject: xs2[4],
          variants: [v2SingleChoiceVariants[0]],
        },
        resolved: false,
        comments: [
          {
            id: "688f1b66-425e-4589-b855-93a043b3b021",
            commentThreadId: "5adfa1dd-57b4-4e25-9e1d-da71674711b3",
            body: "test 3",
          } as ApiComment,
          {
            id: "688f1b66-425e-4589-b855-93a043b3b022",
            commentThreadId: "5adfa1dd-57b4-4e25-9e1d-da71674711b3",
            body: "test 4",
          } as ApiComment,
        ],
      } as TplCommentThread,
    ];

    const {
      commentStatsByComponent,
      commentStatsBySubject,
      commentStatsByVariant,
    } = computeCommentStats(commentThreads);
    expect(commentStatsByComponent).toEqual(
      new Map([
        [component1.uuid, { commentCount: 2, replyCount: 2 }],
        [component2.uuid, { commentCount: 3, replyCount: 2 }],
      ])
    );
    expect(commentStatsBySubject).toEqual(
      new Map([
        [xs1[1].uuid, { commentCount: 1, replyCount: 2 }],
        [xs1[2].uuid, { commentCount: 1, replyCount: 0 }],
        [xs2[3].uuid, { commentCount: 1, replyCount: 1 }],
        [xs2[4].uuid, { commentCount: 2, replyCount: 1 }],
      ])
    );
    expect(commentStatsByVariant).toEqual(
      new Map([
        [
          getSubjectVariantsKey(xs1[1], [v0]),
          { commentCount: 1, replyCount: 2 },
        ],
        [
          getSubjectVariantsKey(xs1[2], [v1SingleChoiceVariants[0]]),
          { commentCount: 1, replyCount: 0 },
        ],
        [
          getSubjectVariantsKey(xs2[3], [v0]),
          { commentCount: 1, replyCount: 1 },
        ],
        [
          getSubjectVariantsKey(xs2[4], [v0]),
          { commentCount: 1, replyCount: 0 },
        ],
        [
          getSubjectVariantsKey(xs2[4], [v2SingleChoiceVariants[0]]),
          { commentCount: 1, replyCount: 1 },
        ],
      ])
    );
  }));
