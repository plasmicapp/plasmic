import {
  TplCommentThread,
  TplCommentThreads,
  computeCommentStats,
} from "@/wab/client/components/comments/utils";
import { ApiComment } from "@/wab/shared/ApiSchema";
import * as Components from "@/wab/shared/core/components";
import { ComponentType } from "@/wab/shared/core/components";
import * as Tpls from "@/wab/shared/core/tpls";
import { TplNode } from "@/wab/shared/model/classes";
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

    const component1 = Components.mkComponent({
      name: "my component1",
      type: ComponentType.Plain,
      tplTree: xs1[0],
    });

    Tpls.trackComponentRoot(component1);

    const component2 = Components.mkComponent({
      name: "my component2",
      type: ComponentType.Plain,
      tplTree: xs2[0],
    });

    Tpls.trackComponentRoot(component2);

    const commentThreads: TplCommentThreads = [
      {
        id: "5adfa1dd-57b4-4e25-9e1d-da71674711b2",
        subject: xs1[1],
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
        id: "5adfa1dd-57b4-4e25-9e1d-da71674711b2",
        subject: xs1[2],
        resolved: false,
        comments: [
          {
            id: "688f1b66-425e-4589-b855-93a043b3b020",
            commentThreadId: "5adfa1dd-57b4-4e25-9e1d-da71674711b2",
            body: "test",
          } as ApiComment,
        ],
      } as TplCommentThread,
      {
        id: "5adfa1dd-57b4-4e25-9e1d-da71674711b2",
        subject: xs2[3],
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
        ],
      } as TplCommentThread,
      {
        id: "5adfa1dd-57b4-4e25-9e1d-da71674711b2",
        subject: xs2[4],
        resolved: false,
        comments: [
          {
            id: "688f1b66-425e-4589-b855-93a043b3b020",
            commentThreadId: "5adfa1dd-57b4-4e25-9e1d-da71674711b2",
            body: "test",
          } as ApiComment,
        ],
      } as TplCommentThread,
    ];

    const { commentStatsByComponent, commentStatsBySubject } =
      computeCommentStats(commentThreads);
    expect(commentStatsByComponent).toEqual(
      new Map([
        [xs1[0].uuid, { commentCount: 2, replyCount: 2 }],
        [xs2[0].uuid, { commentCount: 2, replyCount: 1 }],
      ])
    );
    expect(commentStatsBySubject).toEqual(
      new Map([
        [xs1[1].uuid, { commentCount: 1, replyCount: 2 }],
        [xs1[2].uuid, { commentCount: 1, replyCount: 0 }],
        [xs2[3].uuid, { commentCount: 1, replyCount: 1 }],
        [xs2[4].uuid, { commentCount: 1, replyCount: 0 }],
      ])
    );
  }));
